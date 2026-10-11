import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { rcRequestSchema, rcSetSchema, publicRcQuestions } from "@/features/quiz/rc-schema";
import { apiError, limitRequest, parseJson, requireSession } from "@/lib/api";
import { generateDailyRc } from "@/lib/ai/rc-generator";
import { koreaStudyDate } from "@/lib/study-model";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const parsed = await parseJson(request, rcRequestSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;
  const { supabase, user } = session.data;
  const limited = limitRequest(request, "daily-rc", user.id, 30, 60_000);
  if (limited) return limited;
  const { data: member, error: membershipError } = await supabase.from("party_members").select("user_id")
    .eq("party_id", input.partyId).eq("user_id", user.id).maybeSingle();
  if (membershipError || !member) return apiError(403, "forbidden");
  const admin = getSupabaseAdminClient();
  if (!admin) return apiError(503, "not_configured");
  const studyDate = koreaStudyDate();
  try {
    if (input.action === "submit") {
      const { data: set, error } = await admin.from("daily_rc_sets").select("questions, study_date")
        .eq("id", input.setId).eq("party_id", input.partyId).maybeSingle();
      if (error) return apiError(500, "load_failed");
      if (!set?.questions) return apiError(404, "quiz_not_found");
      const questions = rcSetSchema.parse({ questions: set.questions }).questions;
      const { data, error: saveError } = await admin.rpc("submit_daily_rc", { p_set: input.setId, p_user: user.id, p_answers: input.answers });
      if (saveError) return apiError(saveError.message.includes("quiz_expired") ? 409 : 500, saveError.message.includes("quiz_expired") ? "quiz_expired" : "save_failed");
      return NextResponse.json({ score: data.score, answers: data.answers, questions }, { headers });
    }
    // 하루 한 세트. DB의 조건부 갱신으로 여러 기기의 동시 생성도 한 요청만 수행한다.
    const { error: ensureError } = await admin.from("daily_rc_sets").upsert({ party_id: input.partyId, study_date: studyDate }, { onConflict: "party_id,study_date", ignoreDuplicates: true });
    if (ensureError) return apiError(500, "save_failed");
    const { data: set, error: loadError } = await admin.from("daily_rc_sets").select("id, questions")
      .eq("party_id", input.partyId).eq("study_date", studyDate).single();
    if (loadError || !set) return apiError(500, "load_failed");
    let questions = set.questions;
    if (!questions) {
      if (!(process.env.GROQ_API_KEY || process.env.GROQ_KEY)) return apiError(503, "ai_not_configured");
      const claimId = randomUUID();
      const { data: claimed, error: claimError } = await admin.from("daily_rc_sets")
        .update({ claim_id: claimId, claimed_until: new Date(Date.now() + 90_000).toISOString() })
        .eq("id", set.id).is("questions", null).lt("claimed_until", new Date().toISOString()).select("id").maybeSingle();
      if (claimError) return apiError(500, "save_failed");
      if (!claimed) return apiError(409, "quiz_generating");
      try {
        questions = await generateDailyRc(studyDate);
        const { data: saved, error: saveError } = await admin.from("daily_rc_sets").update({ questions })
          .eq("id", set.id).eq("claim_id", claimId).select("id").maybeSingle();
        if (saveError || !saved) throw new Error("save_failed");
      } catch {
        await admin.from("daily_rc_sets").update({ claimed_until: "1970-01-01T00:00:00Z" }).eq("id", set.id).eq("claim_id", claimId);
        return apiError(502, "quiz_generation_failed");
      }
    }
    const validated = rcSetSchema.parse({ questions }).questions;
    const { data: attempt, error: attemptError } = await admin.from("daily_rc_attempts").select("score, answers")
      .eq("set_id", set.id).eq("user_id", user.id).maybeSingle();
    if (attemptError) return apiError(500, "load_failed");
    return NextResponse.json({ setId: set.id, studyDate, questions: publicRcQuestions(validated),
      result: attempt ? { ...attempt, questions: validated } : null }, { headers });
  } catch {
    return apiError(500, "quiz_failed");
  }
}
