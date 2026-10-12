import { z } from "zod";

export const sendMessageSchema = z.object({
  roomId: z.string().min(1),
  partyId: z.string().min(1),
  content: z.string().trim().min(1).max(2000),
  /** 같은 메시지 중복 전송 방지용 클라이언트 키 */
  clientId: z.uuid(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** AI 답변 메시지 최대 길이 — DB 제약(chat_messages_content_check)과 같은 값 */
export const AI_MESSAGE_MAX = 6000;

/** AI가 답하지 못했을 때 질문 아래에 남기는 안내 (system 메시지, reply_to = 질문) */
export const AI_FAILED_NOTICE =
  "AI가 답하지 못했어요. 잠시 후 다시 @AI로 물어보거나 질문 창구에 올려 주세요.";

/** AI 답변 확인 · 취소 */
export const confirmAiSchema = z.object({
  roomId: z.uuid(),
  messageId: z.uuid(),
  confirmed: z.boolean(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});
