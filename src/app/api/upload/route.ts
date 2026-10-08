import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, limitRequest, notConfigured } from "@/lib/api";
import { isDriveConfigured, uploadEvidence } from "@/lib/google-drive/drive";
import { getSessionUser, getSupabaseServerClient } from "@/lib/supabase/server";
import { STUDY_CATEGORIES } from "@/types";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const fieldsSchema = z.object({
  category: z.enum(STUDY_CATEGORIES),
  partyId: z.string().min(1),
  studyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * 학습 인증 사진 업로드
 * 1) 파일 검증 2) 로그인·파티 권한 확인 3) 운영자 Drive에 저장 4) study_logs / study_evidences 기록
 * Drive가 아직 연결되지 않았으면 501 + skipped — 클라이언트는 진행률만 반영한다.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  const limited = limitRequest(request, "upload", user?.id, 30, 60 * 60 * 1000);
  if (limited) return limited;

  const form = await request.formData();
  const file = form.get("file");
  const fields = fieldsSchema.safeParse(Object.fromEntries(form));
  if (!(file instanceof File) || !fields.success) return apiError(400, "invalid_request");
  if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES) return apiError(415, "invalid_file");
  const { partyId, category, studyDate } = fields.data;

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    if (!user) return apiError(401, "unauthorized");
    const { data: membership } = await supabase
      .from("party_members")
      .select("user_id")
      .eq("party_id", partyId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return apiError(403, "forbidden");
  }

  if (!isDriveConfigured()) return notConfigured("drive_not_configured");

  const { fileId, mimeType } = await uploadEvidence({
    partyId,
    userFolder: user?.id ?? "demo",
    studyDate,
    fileName: `${category}-${Date.now()}.${file.type.split("/")[1]}`,
    mimeType: file.type,
    data: Buffer.from(await file.arrayBuffer()),
  });

  if (supabase && user) {
    const { data: log, error } = await supabase
      .from("study_logs")
      .insert({ party_id: partyId, user_id: user.id, category, study_date: studyDate, amount: 1 })
      .select("id")
      .single();
    if (error) return apiError(500, "db_failed", { fileId });
    await supabase
      .from("study_evidences")
      .insert({ study_log_id: log.id, drive_file_id: fileId, mime_type: mimeType });
  }

  return NextResponse.json({ fileId });
}
