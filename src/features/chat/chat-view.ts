import type { ChatMessage } from "@/types";
import { parseAiMention } from "./ai-mention";

/** AI 답변이 이 시간 안에 오지 않으면 "준비 중" 표시를 거둔다 (서버 최대 실행 60초 + 여유) */
export const AI_PENDING_MS = 90_000;

export function isAiQuestion(message: ChatMessage) {
  return message.kind === "text" && parseAiMention(message.content) !== null;
}

/** [질문만] — @AI 질문과 그 질문에 달린 AI 답변·안내만 남긴다 */
export function onlyQuestions(messages: ChatMessage[]) {
  const questions = new Set(messages.filter(isAiQuestion).map((m) => m.id));
  return messages.filter(
    (m) => questions.has(m.id) || (m.replyTo !== null && questions.has(m.replyTo)),
  );
}

/** 아직 답(AI 답변이나 실패 안내)이 없고, 보낸 지 오래되지 않은 @AI 질문 */
export function pendingAiIds(messages: ChatMessage[], now: number) {
  const answered = new Set(messages.flatMap((m) => (m.replyTo ? [m.replyTo] : [])));
  return new Set(
    messages
      .filter(
        (m) =>
          isAiQuestion(m) &&
          !answered.has(m.id) &&
          now - Date.parse(m.createdAt) < AI_PENDING_MS,
      )
      .map((m) => m.id),
  );
}
