import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmedReportSchema } from "@/features/quiz/hackers-schema";
import { apiError, limitRequest, requireSession } from "@/lib/api";
import { isReportImage, MAX_REPORT_BYTES } from "@/lib/ai/report-reader";
import { DriveConnectionError, isPersonalDriveConfigured, uploadPersonalEvidence, removePersonalEvidence } from "@/lib/google-drive/personal-drive";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { koreaStudyDate } from "@/lib/study-model";

export const maxDuration = 60;
const reportFields = "id,user_id,study_log_id,test_date,total,correct,rows,method,created_at,profiles(nickname)";
export async function GET(request: Request) {
  const session = await requireSession(); if (!session.ok) return session.response;
  const partyId = z.uuid().safeParse(new URL(request.url).searchParams.get("partyId"));
  if (!partyId.success) return apiError(400,"invalid_request");
  const { data, error } = await session.data.supabase.from("hackers_rc_reports").select(reportFields)
    .eq("party_id",partyId.data).order("created_at",{ ascending:false }).limit(30);
  if (error) return apiError(500,"load_failed");
  return NextResponse.json({ reports:data },{ headers:{ "Cache-Control":"private, no-store" } });
}
export async function POST(request: Request) {
  const session = await requireSession(); if (!session.ok) return session.response;
  const { supabase,user } = session.data;
  const limited = limitRequest(request,"report-save",user.id,30,3600000); if (limited) return limited;
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError(400,"invalid_request"); }
  let raw: unknown;
  try { raw = JSON.parse(String(form.get("report"))); } catch { return apiError(400,"invalid_request"); }
  const parsed = confirmedReportSchema.safeParse(raw);
  const file = form.get("file");
  if (!parsed.success || !(file instanceof File)) return apiError(400,"invalid_request");
  const input = parsed.data;
  if (input.testDate > koreaStudyDate()) return apiError(400,"future_test_date");
  if (!file.size || file.size>MAX_REPORT_BYTES) return apiError(415,"invalid_file");
  const { data:member,error } = await supabase.from("party_members").select("user_id")
    .eq("party_id",input.partyId).eq("user_id",user.id).maybeSingle();
  if (error || !member) return apiError(403,"forbidden");
  const admin = getSupabaseAdminClient(); if (!admin) return apiError(503,"not_configured");
  const { data:existing,error:existingError } = await supabase.from("hackers_rc_reports").select(reportFields)
    .eq("id",input.submissionId).eq("party_id",input.partyId).eq("user_id",user.id).maybeSingle();
  if (existingError) return apiError(500,"load_failed");
  if (existing) return NextResponse.json({ report:existing });
  if (!isPersonalDriveConfigured()) return apiError(503,"drive_not_configured");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isReportImage(bytes,file.type)) return apiError(415,"invalid_file");
  let fileId: string | null = null;
  const cleanup = async () => {
    if (fileId) try { await removePersonalEvidence(user.id,fileId); } catch { console.error("[report] Failed to clean up unrecorded file"); }
  };
  try {
    fileId = await uploadPersonalEvidence({ ownerId:user.id,partyId:input.partyId,studyDate:koreaStudyDate(),
      fileName:`hackers-rc-${input.submissionId}.${file.type.split("/")[1]}`,mimeType:file.type,data:bytes });
    const { data:saved,error:saveError } = await admin.rpc("record_hackers_rc",{
      p_id:input.submissionId,p_party:input.partyId,p_user:user.id,p_test_date:input.testDate,
      p_total:input.total,p_correct:input.correct,p_rows:input.rows,p_method:input.method,p_file:fileId,p_mime:file.type,
    });
    if (saveError || !saved) {
      // 통신 결과가 불명확하면 저장된 증빙 파일을 삭제하지 않는다.
      const { data:check,error:checkError } = await supabase.from("hackers_rc_reports").select(reportFields)
        .eq("id",input.submissionId).eq("party_id",input.partyId).eq("user_id",user.id).maybeSingle();
      if (!checkError && check) return NextResponse.json({ report:check });
      if (!checkError && saveError?.code && /^[0-9A-Z]{5}$/.test(saveError.code)) await cleanup();
      return apiError(500,"save_failed");
    }
    if (!saved.inserted) await cleanup();
    return NextResponse.json({ report:{ ...saved, profiles:null } });
  } catch (e) {
    // RPC 응답이 불명확할 수 있어 기록된 파일을 삭제하지 않는다.
    if (e instanceof DriveConnectionError) return apiError(409,"drive_connection_required");
    const code = (e as { code?: number }).code;
    const reason = (e as { response?: { data?: { error?: unknown } } }).response?.data?.error;
    if (code === 401 || reason === "invalid_grant") return apiError(409,"drive_reconnect_required");
    return apiError(502,"upload_failed");
  }
}
