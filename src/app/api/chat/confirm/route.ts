import { NextResponse } from "next/server";
import { confirmAiSchema } from "@/features/chat/chat-schema";
import { apiError, limitRequest, parseJson, requireSession } from "@/lib/api";

/**
 * AI 답변 확인·취소. 같은 방의 AI 답변에 본인 이름으로만 남길 수 있다(RLS가 검사).
 * 바뀐 내용은 DB 트리거가 방 토픽으로 알려서 열린 채팅 화면이 다시 읽는다.
 */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { supabase, user } = session.data;

  const limited = limitRequest(request, "chat-confirm", user.id, 60, 60 * 1000);
  if (limited) return limited;

  const body = await parseJson(request, confirmAiSchema);
  if (!body.ok) return body.response;
  const { roomId, messageId, confirmed } = body.data;

  const table = supabase.from("chat_ai_confirmations");
  const { error } = confirmed
    ? await table.upsert(
        { message_id: messageId, room_id: roomId, user_id: user.id },
        { onConflict: "message_id,user_id", ignoreDuplicates: true },
      )
    : await table.delete().eq("message_id", messageId).eq("user_id", user.id);
  if (error) return apiError(403, "forbidden_or_failed");
  return NextResponse.json({ confirmed });
}
