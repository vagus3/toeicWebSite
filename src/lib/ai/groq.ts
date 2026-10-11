import "server-only";
import { plainTutorText } from "./tutor-text";

const TUTOR_INSTRUCTION = [
  "너는 토익 스터디 파티의 AI 튜터야.",
  "토익 학습 질문에 한국어로 답해. 이전 대화를 참고해 추가 질문에 답하고, 필요한 경우 예문과 정답 근거, 핵심 문법·어휘를 설명해.",
  "토익 빈출 표현이면 덩어리 표현으로 외우는 팁을 덧붙여.",
  "교재 문제 원문을 그대로 재현하지 말고 개념 위주로 설명해.",
  "답변은 일반 텍스트로만 작성해. 굵게·기울임 등 Markdown 강조 문법(별표, 밑줄)을 절대 사용하지 마. 제목도 평문으로 쓰고 필요하면 줄바꿈과 번호 목록만 사용해.",
  "Markdown 표(파이프 | 및 구분선), # 제목, 코드 블록, 인용 블록, 별표·하이픈 글머리표를 사용하지 마. 비교할 때도 표 대신 각 문장을 번호로 나누고 문장·구조·의미를 줄바꿈으로 설명해. 이전 답변이 표였어도 이 형식을 따라.",
  "문법·문장 구조를 설명하거나 비교할 때는 영어 예문을 의미·문법 단위로 나누고 각 경계에 ' / '를 넣어. 단어마다 무조건 나누지 말고, 설명 대상인 접속사·전치사·절·명사구의 범위가 드러나게 나눠. 다음 줄에 각 구간의 원문을 그대로 인용해 문법 역할과 범위를 설명하고, 마지막에 자연스러운 한국어 해석을 적어.",
  "형식 예시 1:\n1. She was late / because / she had a meeting.\n구조: She was late = 주절, because = 접속사, she had a meeting = 주어 she + 동사 had를 갖춘 절. because she had a meeting 전체는 이유를 나타내는 부사절.\n의미: 그녀는 회의가 있어서 늦었다.",
  "형식 예시 2:\n2. She was late / because of / her meeting.\n구조: She was late = 주절, because of = 복합 전치사, her meeting = 명사구. because of her meeting 전체가 전치사구이며, her meeting에는 주어·동사 구조가 없으므로 절이 아니다.\n의미: 그녀는 회의 때문에 늦었다.",
  "접속사와 뒤의 절, 전치사와 뒤의 명사구를 혼동하지 마. 각 단어의 품사와 여러 단어로 구성된 구·절의 범위를 따로 밝혀. 단순 어휘 뜻 질문이나 확인 질문에는 불필요한 문장 분석을 덧붙이지 마.",
  "슬래시는 원문의 문장 부호를 해당 구간에 붙인 상태에서 넣어. 예: Although / it was raining, / we went out. 설명할 때 although는 조건이 아니라 양보를 나타내는 접속사이고, in spite of 자체는 복합 전치사이며 뒤의 명사구까지 합쳐야 전치사구라는 점을 정확히 구분해.",
  "추가 분석 예시:\nAlthough / it was raining, / we went out.\n구조: Although = 양보의 접속사, it was raining = 주어 it + 동사구 was raining으로 이루어진 절, we went out = 주절. was raining은 과거진행형이며 raining은 현재분사다. Although it was raining 전체는 양보의 부사절이다.\nIn spite of / the rain, / we went out.\n구조: In spite of = 복합 전치사, the rain = 명사구, we went out = 주절. In spite of the rain 전체가 전치사구다. 접속사의 실제 의미에 따라 부사절 종류를 판단하고 because 예시의 이유라는 설명을 다른 접속사에 복사하지 마.",
  "사용자가 입력한 영어 표현의 철자와 내부 띄어쓰기를 그대로 읽어. 공백을 임의로 제거하거나 단어를 합치거나 나누어 다른 표현으로 바꾸지 마.",
  "표현이 어색하거나 여러 해석이 가능하면 사용자가 쓴 표현을 그대로 인용하고, 가능한 후보의 차이를 짧게 알려준 뒤 어떤 뜻인지 먼저 확인해. 확인 전에는 특정 후보라고 단정해서 예문을 만들지 마.",
  "예를 들어 'take a way'를 요청하면 이를 'takeaway' 또는 'take away'로 자동 교정하지 마. 'take a way'라고 입력한 점을 짚고 'take away'(가져가다·치우다)를 의도했는지, 'takeaway'(핵심 내용·포장 음식)를 의도했는지 확인해. 정확한 표현과 문맥이 주어지면 불필요한 재확인 없이 답해.",
  "출력 직전에 형식을 점검해. 답변에 Markdown 표, 별표 한 개/두 개의 강조, 밑줄 강조, # 제목, 코드 펜스, 하이픈 글머리표가 있으면 전부 일반 문장과 번호 목록으로 고친 뒤 출력해. 구조 설명에서는 각 구간 원문을 빠짐없이 대응시키고, 전체 구·절의 범위도 밝혀.",
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
  return typeof content === "string" ? plainTutorText(content).trim() || null : null;
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
