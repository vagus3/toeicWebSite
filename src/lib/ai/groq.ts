import "server-only";

const TUTOR_INSTRUCTION = [
  "너는 토익 스터디 파티의 AI 튜터야.",
  "토익 학습 질문에 한국어로 답해. 이전 대화를 참고해 추가 질문에 답하고, 필요한 경우 예문과 정답 근거, 핵심 문법·어휘를 설명해.",
  "토익 빈출 표현이면 덩어리 표현으로 외우는 팁을 덧붙여.",
  "교재 문제 원문을 그대로 재현하지 말고 개념 위주로 설명해.",
].join("\n");

type Message = { role: "system" | "user" | "assistant"; content: string };

function getApiKey() {
  return process.env.GROQ_API_KEY || process.env.GROQ_KEY;
}

export function isAiConfigured() {
  return Boolean(getApiKey());
}

async function complete(messages: Message[]) {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: TUTOR_INSTRUCTION }, ...messages],
      temperature: 0.4,
      max_completion_tokens: 4096,
      ...(model.startsWith("openai/gpt-oss-") ? { reasoning_effort: "low" } : {}),
    }),
    signal: AbortSignal.timeout(40_000),
    cache: "no-store",
  });
  // 제공업체 오류에는 요청 정보가 들어갈 수 있어 본문을 로그·응답에 노출하지 않는다.
  if (!response.ok) throw new Error("ai_provider_failed");
  const result = await response.json() as { choices?: { message?: { content?: unknown } }[] };
  const content = result.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() || null : null;
}

/** 질문과 AI 대화만 전달한다. 계정 정보, 사진, 파티원 댓글은 포함하지 않는다. */
export async function answerTutorConversation(
  tag: string,
  question: string,
  initialAnswer: string | null,
  turns: { prompt: string; answer: string }[],
  prompt: string,
) {
  const messages: Message[] = [{ role: "user", content: `[${tag}] ${question}` }];
  if (initialAnswer) messages.push({ role: "assistant", content: initialAnswer });
  for (const turn of turns) {
    messages.push({ role: "user", content: turn.prompt }, { role: "assistant", content: turn.answer });
  }
  messages.push({ role: "user", content: prompt });
  return complete(messages);
}

export async function answerInitialQuestion(tag: string, question: string) {
  return complete([{ role: "user", content: `[${tag}] ${question}` }]);
}
