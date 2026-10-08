export interface RoomMemberPrefs {
  user_id: string;
  muted_until: string | null;
  notification_preferences: { chat_enabled: boolean; preview_enabled: boolean } | null;
}

/**
 * 채팅 푸시 받을 사람 나누기 — 음소거 중이거나 채팅 알림을 끈 사람은 빼고,
 * 미리보기를 끈 사람에게는 내용 없이 "새 메시지" 알림만 보낸다.
 */
export function splitChatRecipients(members: RoomMemberPrefs[], now: number) {
  const targets = members.filter(
    (m) => (!m.muted_until || Date.parse(m.muted_until) < now) && m.notification_preferences?.chat_enabled !== false,
  );
  return {
    withPreview: targets.filter((m) => m.notification_preferences?.preview_enabled !== false).map((m) => m.user_id),
    withoutPreview: targets.filter((m) => m.notification_preferences?.preview_enabled === false).map((m) => m.user_id),
  };
}

export function previewText(content: string, max = 80) {
  return content.length > max ? `${content.slice(0, max)}…` : content;
}
