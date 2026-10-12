import type { SupabaseClient } from "@supabase/supabase-js";
import { after, NextResponse } from "next/server";
import { parseAiMention } from "@/features/chat/ai-mention";
import {
  AI_FAILED_NOTICE,
  AI_MESSAGE_MAX,
  sendMessageSchema,
} from "@/features/chat/chat-schema";
import { answerChatQuestion, isAiConfigured } from "@/lib/ai/groq";
import { apiError, limitRequest, parseJson, requireSession } from "@/lib/api";
import { previewText, splitChatRecipients, type RoomMemberPrefs } from "@/lib/push/recipients";
import { sendPushToUsers } from "@/lib/push/web-push";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

// @AI 답변은 응답 뒤(after)에 만들고, 이 라우트의 최대 실행 시간 안에 끝나야 한다 (Groq 요청 제한 40초)
export const maxDuration = 60;

const AI_DAILY_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @AI 답변 저장. AI 답변과 실패 안내는 클라이언트가 쓸 수 없어서 서버(service role)가 쓴다.
 * 실패해도 질문 아래에 안내를 남겨, 화면의 "답변 준비 중" 표시가 끝나게 한다.
 */
async function answerInChat(
  admin: SupabaseClient,
  roomId: string,
  questionId: string,
  askerId: string,
  prompt: string,
) {
  let answer: string | null = null;
  try {
    answer = await answerChatQuestion(prompt);
  } catch {
    answer = null;
  }
  const base = { room_id: roomId, sender_id: askerId, reply_to: questionId };
  const { error } = await admin.from("chat_messages").insert(
    answer
      ? {
          ...base,
          message_type: "ai",
          content:
            answer.length > AI_MESSAGE_MAX
              ? `${answer.slice(0, AI_MESSAGE_MAX - 1)}…`
              : answer,
        }
      : { ...base, message_type: "system", content: AI_FAILED_NOTICE },
  );
  // 오류 본문에는 질문 내용이 들어갈 수 있어 로그에 남기지 않는다
  if (error) console.error("[chat] AI answer not saved");
}

/**
 * 메시지 전송
 * 1) 세션·채팅방 멤버 확인 2) chat_messages 저장 (Realtime은 DB 트리거가 브로드캐스트)
 * 3) "@AI"로 시작하면 응답 후(after) AI 답변을 같은 방에 저장
 * 4) 응답 후(after) 발신자 제외 · 음소거/미리보기 설정을 반영해 Web Push 발송 — 푸시 실패는 전송 성공에 영향 없음
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

  // @AI 질문은 저장하기 전에 AI 사용 가능 여부와 하루 한도(질문 창구와 공유)를 본다.
  // 막히면 질문도 보내지 않아서, 사용자가 @AI 없이 다시 보낼 수 있다.
  const mention = parseAiMention(content);
  const admin = mention ? getSupabaseAdminClient() : null;
  if (mention) {
    if (!isAiConfigured() || !admin) return apiError(503, "ai_not_configured");
    // 1분 30개 채팅 제한과 구분되게 따로 알린다 (화면 안내 문구가 다르다)
    if (limitRequest(request, "study-ai", user.id, AI_DAILY_LIMIT, DAY_MS))
      return apiError(429, "ai_limit_reached");
  }

  // client_id 유니크로 같은 요청이 두 번 와도 한 번만 저장. RLS가 채팅방 멤버만 허용
  const { data: message, error } = await supabase
    .from("chat_messages")
    .upsert(
      { room_id: roomId, sender_id: user.id, content, client_id: clientId, message_type: "text" },
      { onConflict: "client_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) return apiError(403, "forbidden_or_failed");

  // 같은 요청을 다시 보낸 경우(message 없음)에는 답변을 또 만들지 않는다
  if (mention && admin && message) {
    after(() => answerInChat(admin, roomId, message.id, user.id, mention.prompt));
  }

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
    const { withPreview, withoutPreview } = splitChatRecipients(
      (members ?? []) as unknown as RoomMemberPrefs[],
      Date.now(),
    );
    const base = {
      title: `${sender?.nickname ?? "파티원"}님 · ${party?.name ?? "스터디방"}`,
      url: `/party/${partyId}/chat/${roomId}`,
      tag: `chat-${roomId}`,
    };
    await Promise.all([
      sendPushToUsers(withPreview, { ...base, body: previewText(content) }),
      sendPushToUsers(withoutPreview, { ...base, body: "새 메시지가 있어요" }),
    ]);
  });

  return NextResponse.json({ id: message?.id ?? null });
}
