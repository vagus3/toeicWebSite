import { after, NextResponse } from "next/server";
import { sendMessageSchema } from "@/features/chat/chat-schema";
import { apiError, limitRequest, parseJson, requireSession } from "@/lib/api";
import { previewText, splitChatRecipients, type RoomMemberPrefs } from "@/lib/push/recipients";
import { sendPushToUsers } from "@/lib/push/web-push";

/**
 * 메시지 전송
 * 1) 세션·채팅방 멤버 확인 2) chat_messages 저장 (Realtime은 DB 트리거가 브로드캐스트)
 * 3) 응답 후(after) 발신자 제외 · 음소거/미리보기 설정을 반영해 Web Push 발송 — 푸시 실패는 전송 성공에 영향 없음
 */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { supabase, user } = session.data;

  const limited = limitRequest(request, "chat", user.id, 30, 60 * 1000);
  if (limited) return limited;

  const body = await parseJson(request, sendMessageSchema);
  if (!body.ok) return body.response;
  const { roomId, partyId, content, clientId } = body.data;

  // client_id 유니크로 같은 요청이 두 번 와도 한 번만 저장. RLS가 채팅방 멤버만 허용
  const { data: message, error } = await supabase
    .from("chat_messages")
    .upsert({ room_id: roomId, sender_id: user.id, content, client_id: clientId, message_type: "text" }, { onConflict: "client_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (error) return apiError(403, "forbidden_or_failed");

  after(async () => {
    const [{ data: members }, { data: sender }, { data: party }] = await Promise.all([
      supabase
        .from("chat_room_members")
        .select("user_id, muted_until, notification_preferences(chat_enabled, preview_enabled)")
        .eq("room_id", roomId)
        .neq("user_id", user.id),
      supabase.from("profiles").select("nickname").eq("id", user.id).single(),
      supabase.from("parties").select("name").eq("id", partyId).single(),
    ]);
    const { withPreview, withoutPreview } = splitChatRecipients((members ?? []) as unknown as RoomMemberPrefs[], Date.now());
    const base = { title: `${sender?.nickname ?? "파티원"}님 · ${party?.name ?? "스터디방"}`, url: `/party/${partyId}/chat/${roomId}`, tag: `chat-${roomId}` };
    await Promise.all([
      sendPushToUsers(withPreview, { ...base, body: previewText(content) }),
      sendPushToUsers(withoutPreview, { ...base, body: "새 메시지가 있어요" }),
    ]);
  });

  return NextResponse.json({ id: message?.id ?? null });
}
