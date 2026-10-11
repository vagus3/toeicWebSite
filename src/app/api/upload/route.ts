import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, limitRequest, requireSession } from "@/lib/api";
import {
  DriveConnectionError,
  isPersonalDriveConfigured,
  removePersonalEvidence,
  uploadPersonalEvidence,
} from "@/lib/google-drive/personal-drive";
import { koreaStudyDate } from "@/lib/study-model";
import { STUDY_CATEGORIES } from "@/types";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const fieldsSchema = z.object({
  category: z.enum(STUDY_CATEGORIES),
  partyId: z.uuid(),
});

/** 학습 로그와 사진 메타데이터는 record_study_evidence에서 원자적으로 저장한다. */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { supabase, user } = session.data;
  const limited = limitRequest(request, "upload", user.id, 30, 60 * 60 * 1000);
  if (limited) return limited;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "invalid_request");
  }
  const file = form.get("file");
  const fields = fieldsSchema.safeParse(Object.fromEntries(form));
  if (!(file instanceof File) || !fields.success)
    return apiError(400, "invalid_request");
  if (!ALLOWED.includes(file.type) || !file.size || file.size > MAX_BYTES)
    return apiError(415, "invalid_file");
  const { partyId, category } = fields.data;
  const { data: membership, error } = await supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", partyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !membership) return apiError(403, "forbidden");
  if (!isPersonalDriveConfigured())
    return apiError(503, "drive_not_configured");
  try {
    const date = koreaStudyDate();
    const fileName = `${category}-${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const fileId = await uploadPersonalEvidence({
      ownerId: user.id,
      partyId,
      studyDate: date,
      fileName,
      mimeType: file.type,
      data: Buffer.from(await file.arrayBuffer()),
    });
    const saved = await supabase.rpc("record_study_evidence", {
      p_party: partyId,
      p_category: category,
      p_file_id: fileId,
      p_mime_type: file.type,
      p_storage_path: null,
    });
    if (saved.error) {
      try {
        await removePersonalEvidence(user.id, fileId);
      } catch {
        console.error("[upload] Failed to clean up an unrecorded photo");
      }
      return apiError(500, "db_failed");
    }
    return NextResponse.json({ fileId });
  } catch (error) {
    if (error instanceof DriveConnectionError)
      return apiError(409, "drive_connection_required");
    const code = (error as { code?: number }).code;
    const reason = (error as { response?: { data?: { error?: unknown } } })
      .response?.data?.error;
    if (code === 401 || reason === "invalid_grant")
      return apiError(409, "drive_reconnect_required");
    return apiError(502, "upload_failed");
  }
}
