import "server-only";

import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

const TUTOR_INSTRUCTION = [
  "너는 토익 스터디 파티의 AI 튜터야.",
  "질문에 대해 정답 근거, 핵심 문법·어휘, 오답이 되는 이유를 한국어로 3~4문장 안에 설명해.",
  "토익 빈출 표현이면 덩어리 표현으로 외우는 팁을 한 줄 덧붙여.",
  "교재 문제 원문을 그대로 재현하지 말고 개념 위주로 설명해.",
].join("\n");

let client: GoogleGenAI | null = null;

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/** 질문 창구 초안 답변 */
export async function draftTutorAnswer(tag: string, question: string) {
  const ai = getClient();
  if (!ai) return null;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `[${tag}] ${question}`,
    config: { systemInstruction: TUTOR_INSTRUCTION, maxOutputTokens: 600, temperature: 0.4 },
  });
  return response.text?.trim() || null;
}
