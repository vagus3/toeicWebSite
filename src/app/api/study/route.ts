import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { gradeQuiz, studyActionSchema } from "@/features/study/study-schema";
import { draftTutorAnswer } from "@/lib/ai/gemini";
import { apiError, limitRequest, parseJson, requireSession } from "@/lib/api";
import { loadStudySnapshot } from "@/lib/study-server";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const preferred =
    new URL(request.url).searchParams.get("partyId") ??
    (await cookies()).get("study-party")?.value;
  try {
    return NextResponse.json(
      await loadStudySnapshot(
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
  const limited = limitRequest(
    request,
    `study-${input.action}`,
    user.id,
    input.action === "question" ? 20 : 120,
    input.action === "question" ? 86400000 : 60000,
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
        let answer =
          "AI 초안을 만들지 못했어요. 파티원의 보충 답변을 기다려 주세요.";
        try {
          answer =
            (await draftTutorAnswer(input.tag, input.title)) ??
            "AI가 연결되지 않았어요. 파티원의 보충 답변을 기다려 주세요.";
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
