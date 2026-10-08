import "server-only";

import webpush from "web-push";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export interface PushPayload {
  title: string;
  body: string;
  /** 알림을 누르면 열 경로 */
  url: string;
  tag?: string;
}

let configured = false;

export function isPushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function ensureVapid() {
  if (configured) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configured = true;
}

/**
 * 사용자들의 모든 기기로 푸시 발송. 만료된 구독(404/410)은 정리한다.
 * 발송 실패는 호출한 쪽(메시지 저장 등)의 성공 여부에 영향을 주지 않는다.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const admin = getSupabaseAdminClient();
  if (!isPushConfigured() || !admin || userIds.length === 0) return { sent: 0 };
  ensureVapid();

  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds);
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 });
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return { sent };
}
