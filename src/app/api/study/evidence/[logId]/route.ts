import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireSession } from "@/lib/api";
import { readEvidence } from "@/lib/google-drive/drive";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ logId: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const logId = z.uuid().safeParse((await params).logId);
  if (!logId.success) return apiError(400, "invalid_request");
  // study_evidences의 RLS로 같은 파티 사용자에게만 파일 위치를 반환한다.
  const { data, error } = await session.data.supabase
    .from("study_evidences")
    .select("storage_path, drive_file_id, mime_type")
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
    return new Response(await readEvidence(data.drive_file_id), {
      headers: {
        "Content-Type": data.mime_type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return apiError(502, "photo_unavailable");
  }
}
