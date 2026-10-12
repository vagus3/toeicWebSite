import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { gradeQuiz, studyActionSchema } from "@/features/study/study-schema";
import { answerTutorConversation, answerInitialQuestion, isAiConfigured } from "@/lib/ai/groq";
import { apiError, limitRequest, parseJson, requireSession } from "@/lib/api";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { loadStudyCore } from "@/lib/study-server";

export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const preferred =
    new URL(request.url).searchParams.get("partyId") ??
    (await cookies()).get("study-party")?.value;
  try {
    return NextResponse.json(
      await loadStudyCore(
        session.data.supabase,
        session.data.user.id,
        preferred,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return apiError(500, "study_load_failed");
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { supabase, user } = session.data;
  const body = await parseJson(request, studyActionSchema);
  if (!body.ok) return body.response;
  const input = body.data;
  const isAiRequest = input.action === "question" || input.action === "ask-ai";
  const limited = limitRequest(
    request,
    isAiRequest ? "study-ai" : `study-${input.action}`,
    user.id,
    isAiRequest ? 20 : 120,
    isAiRequest ? 86400000 : 60000,
  );
  if (limited) return limited;
  const { data: member, error: membershipError } = await supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", input.partyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError || !member) return apiError(403, "forbidden");
  try {
    let result: { error: { message: string } | null };
    switch (input.action) {
      case "score":
        result = await supabase
          .from("quiz_attempts")
          .insert({
            party_id: input.partyId,
            user_id: user.id,
            kind: "weekly",
            score: input.lc + input.rc,
            lc_score: input.lc,
            rc_score: input.rc,
          });
        break;
      case "question": {
        let answer: string | null = null;
        try {
          answer = await answerInitialQuestion(input.tag, input.title);
        } catch {
          /* AI 장애여도 질문은 저장한다. */
        }
        result = await supabase
          .from("questions")
          .insert({
            party_id: input.partyId,
            user_id: user.id,
            tag: input.tag,
            title: input.title,
            ai_answer: answer,
          });
        break;
      }
      case "ask-ai": {
        const { data: question, error: questionError } = await supabase
          .from("questions")
          .select("id, tag, title, ai_answer")
          .eq("id", input.threadId)
          .eq("party_id", input.partyId)
          .maybeSingle();
        if (questionError) return apiError(500, "study_load_failed");
        if (!question) return apiError(403, "forbidden");
        if (!isAiConfigured()) return apiError(503, "ai_not_configured");
        const admin = getSupabaseAdminClient();
        if (!admin) return apiError(503, "ai_not_configured");
        const { data: turns, error: historyError } = await supabase
          .from("question_ai_turns")
          .select("prompt, answer")
          .eq("question_id", question.id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(10);
        if (historyError) return apiError(500, "study_load_failed");
        let answer: string | null;
        try {
          answer = await answerTutorConversation(
            question.tag, question.title, question.ai_answer,
            [...(turns ?? [])].reverse(), input.prompt,
          );
        } catch {
          return apiError(502, "ai_failed");
        }
        if (!answer) return apiError(502, "ai_failed");
        // 호출자는 RLS로 질문을 읽은 파티원이다. AI 답변은 서버만 기록한다.
        result = await admin.from("question_ai_turns").insert({
          question_id: question.id,
          user_id: user.id,
          prompt: input.prompt,
          answer,
        });
        break;
      }
      case "reply": {
        const { data: question } = await supabase
          .from("questions")
          .select("id")
          .eq("id", input.threadId)
          .eq("party_id", input.partyId)
          .maybeSingle();
        if (!question) return apiError(403, "forbidden");
        result = await supabase
          .from("question_replies")
          .insert({
            question_id: input.threadId,
            user_id: user.id,
            body: input.text,
          });
        break;
      }
      case "confirm-ai": {
        const { data: question } = await supabase
          .from("questions")
          .select("id")
          .eq("id", input.threadId)
          .eq("party_id", input.partyId)
          .maybeSingle();
        if (!question) return apiError(403, "forbidden");
        // 실제로 있는 AI 답변인지·본인 이름인지는 RLS가 검사한다
        const confirmations = supabase.from("question_ai_confirmations");
        if (input.confirmed) {
          const inserted = await confirmations.insert({
            question_id: input.threadId,
            turn_id: input.turnId,
            user_id: user.id,
          });
          // 이미 확인한 답변(유니크 위반)은 그대로 성공으로 본다
          result = inserted.error?.code === "23505" ? { error: null } : inserted;
        } else {
          const mine = confirmations
            .delete()
            .eq("question_id", input.threadId)
            .eq("user_id", user.id);
          result = await (input.turnId
            ? mine.eq("turn_id", input.turnId)
            : mine.is("turn_id", null));
        }
        break;
      }
      case "cheer": {
        const { data: log } = await supabase
          .from("study_logs")
          .select("id")
          .eq("id", input.logId)
          .eq("party_id", input.partyId)
          .maybeSingle();
        if (!log) return apiError(403, "forbidden");
        result = await supabase
          .from("reactions")
          .upsert(
            { study_log_id: input.logId, user_id: user.id, type: "cheer" },
            { onConflict: "study_log_id,user_id,type", ignoreDuplicates: true },
          );
        break;
      }
      case "nudge": {
        const { data: receiver } = await supabase
          .from("party_members")
          .select("user_id")
          .eq("party_id", input.partyId)
          .eq("user_id", input.memberId)
          .maybeSingle();
        if (!receiver || receiver.user_id === user.id)
          return apiError(400, "invalid_receiver");
        result = await supabase
          .from("nudges")
          .upsert(
            {
              party_id: input.partyId,
              sender_id: user.id,
              receiver_id: input.memberId,
            },
            {
              onConflict: "party_id,sender_id,receiver_id,nudge_date",
              ignoreDuplicates: true,
            },
          );
        break;
      }
      case "quiz":
        result = await supabase.rpc("record_daily_quiz", {
          p_party: input.partyId,
          p_score: gradeQuiz(input.answers),
          p_answers: input.answers,
        });
        break;
    }
    if (result.error) return apiError(500, "save_failed");
    return NextResponse.json({ saved: true });
  } catch {
    return apiError(500, "save_failed");
  }
}
