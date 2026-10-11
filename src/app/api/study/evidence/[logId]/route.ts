import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireSession } from "@/lib/api";
import { readEvidence } from "@/lib/google-drive/drive";
import {
  readPersonalEvidence,
  readPersonalThumbnail,
} from "@/lib/google-drive/personal-drive";

/** Drive 파일 ID는 바뀌지 않으므로 같은 기기에서 다시 볼 때 Drive를 다시 부르지 않는다 */
const PHOTO_CACHE = "private, max-age=3600";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ logId: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const logId = z.uuid().safeParse((await params).logId);
  if (!logId.success) return apiError(400, "invalid_request");
  const thumbnail = new URL(request.url).searchParams.get("size") === "thumb";
  // study_evidences의 RLS로 같은 파티 사용자에게만 파일 위치를 반환한다.
  const { data, error } = await session.data.supabase
    .from("study_evidences")
    .select("storage_path, drive_file_id, drive_owner_id, mime_type")
    .eq("study_log_id", logId.data)
    .limit(1)
    .maybeSingle();
  if (error || !data) return apiError(404, "not_found");
  try {
    if (data.storage_path) {
      const signed = await session.data.supabase.storage
        .from("study-evidence")
        .createSignedUrl(data.storage_path, 60);
      if (signed.error || !signed.data)
        return apiError(502, "photo_unavailable");
      return NextResponse.redirect(signed.data.signedUrl, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    // 목록용 작은 이미지를 먼저 시도하고, 아직 없으면 원본으로 대체한다
    const small =
      thumbnail && data.drive_owner_id
        ? await readPersonalThumbnail(data.drive_owner_id, data.drive_file_id).catch(
            () => null,
          )
        : null;
    if (small)
      return new Response(small.body, {
        headers: {
          "Content-Type": small.mimeType,
          "Cache-Control": PHOTO_CACHE,
          "X-Content-Type-Options": "nosniff",
        },
      });
    const photo = data.drive_owner_id
      ? await readPersonalEvidence(data.drive_owner_id, data.drive_file_id)
      : await readEvidence(data.drive_file_id);
    return new Response(photo, {
      headers: {
        "Content-Type": data.mime_type,
        "Cache-Control": PHOTO_CACHE,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return apiError(502, "photo_unavailable");
  }
}
