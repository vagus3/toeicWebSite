import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, limitRequest, requireSession } from "@/lib/api";
import {
  isDriveConfigured,
  removeUploadedEvidence,
  uploadEvidence,
} from "@/lib/google-drive/drive";
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
  try {
    const date = koreaStudyDate();
    const fileName = `${category}-${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    let fileId: string | null = null;
    let storagePath: string | null = null;
    if (isDriveConfigured()) {
      fileId = (
        await uploadEvidence({
          partyId,
          userFolder: user.id,
          studyDate: date,
          fileName,
          mimeType: file.type,
          data: Buffer.from(await file.arrayBuffer()),
        })
      ).fileId;
    } else {
      storagePath = `${partyId}/${user.id}/${date}/${fileName}`;
      const uploaded = await supabase.storage
        .from("study-evidence")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploaded.error) return apiError(502, "upload_failed");
    }
    const saved = await supabase.rpc("record_study_evidence", {
      p_party: partyId,
      p_category: category,
      p_file_id: fileId,
      p_mime_type: file.type,
      p_storage_path: storagePath,
    });
    if (saved.error) {
      try {
        if (storagePath)
          await supabase.storage.from("study-evidence").remove([storagePath]);
        if (fileId) await removeUploadedEvidence(fileId);
      } catch {
        console.error("[upload] Failed to clean up an unrecorded photo");
      }
      return apiError(500, "db_failed");
    }
    return NextResponse.json({ fileId, storagePath });
  } catch {
    return apiError(502, "upload_failed");
  }
}
