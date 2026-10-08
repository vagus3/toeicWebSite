import { NextResponse } from "next/server";
import { askRequestSchema, type AskResponse } from "@/features/qna/ask-schema";
import { draftTutorAnswer } from "@/lib/ai/gemini";
import { apiError, limitRequest, parseJson } from "@/lib/api";
import { getSessionUser } from "@/lib/supabase/server";

/** 사용자별 하루 질문 횟수 제한 */
const DAILY_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const FALLBACK = "AI 초안은 서버에 GEMINI_API_KEY를 설정하면 자동으로 만들어져요. 그동안 파티원들의 보충 답변을 기다려 주세요.";

export async function POST(request: Request) {
  const body = await parseJson(request, askRequestSchema);
  if (!body.ok) return body.response;

  const user = await getSessionUser();
  const limited = limitRequest(request, "ask", user?.id, DAILY_LIMIT, DAY_MS);
  if (limited) return limited;

  try {
    const answer = await draftTutorAnswer(body.data.tag, body.data.title);
    return NextResponse.json<AskResponse>({ answer: answer ?? FALLBACK, fallback: !answer });
  } catch (error) {
    console.error("[ai/ask]", error);
    return apiError(502, "ai_failed");
  }
}
