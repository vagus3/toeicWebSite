import { z } from "zod";

export const sendMessageSchema = z.object({
  roomId: z.string().min(1),
  partyId: z.string().min(1),
  content: z.string().trim().min(1).max(2000),
  /** 같은 메시지 중복 전송 방지용 클라이언트 키 */
  clientId: z.uuid(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const pushSubscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});
