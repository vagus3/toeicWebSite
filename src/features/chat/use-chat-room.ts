"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CHAT_MESSAGES, DEMO_AI_ANSWER } from "@/lib/demo-data";
import { requestJson } from "@/lib/http";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useStudyStore } from "@/stores/study-store";
import type { ChatMessage, ChatMessageKind } from "@/types";
import { parseAiMention } from "./ai-mention";

interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type: ChatMessageKind;
  reply_to: string | null;
  study_log_id: string | null;
  profiles?: { nickname: string } | null;
  chat_ai_confirmations?: { user_id: string; profiles?: { nickname: string } | null }[];
  study_logs?: { reactions?: { user_id: string; type: string }[] } | null;
}

// 발신자는 sender_id 관계로 콕 집어 읽는다. chat_ai_confirmations가 메시지와 프로필을 잇는 표라서
// "profiles"만 쓰면 PostgREST가 두 관계 중 하나를 고르지 못하고 오류를 낼 수 있다.
const MESSAGE_FIELDS = [
  "id, room_id, sender_id, content, created_at, message_type, reply_to, study_log_id",
  "profiles!sender_id(nickname)",
  "chat_ai_confirmations(user_id, profiles(nickname))",
  "study_logs(reactions(user_id, type))",
].join(", ");

function toMessage(row: MessageRow): ChatMessage {
  const name = row.profiles?.nickname ?? "파티원";
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    senderName: name,
    initial: name.slice(0, 1),
    content: row.content,
    createdAt: row.created_at,
    kind: row.message_type,
    replyTo: row.reply_to,
    logId: row.study_log_id,
    confirmedBy: (row.chat_ai_confirmations ?? []).map((c) => ({
      id: c.user_id,
      name: c.profiles?.nickname ?? "파티원",
    })),
    cheeredBy: (row.study_logs?.reactions ?? [])
      .filter((r) => r.type === "cheer")
      .map((r) => r.user_id),
  };
}

/**
 * 채팅방 메시지 — DB(chat_messages)가 원본, Realtime Broadcast는 바뀐 것을 알리는 용도.
 * 새 메시지·AI 답변·인증 알림(INSERT)과 AI 답변 확인·취소(INSERT/DELETE)가 같은 토픽으로 온다.
 * Supabase 키가 없으면 데모 메시지로 로컬에서만 동작한다.
 */
export function useChatRoom(partyId: string, roomId: string) {
  const queryClient = useQueryClient();
  const key = ["chat", roomId];
  const supabase = getSupabaseBrowserClient();
  const me = useStudyStore((s) => s.me);
  const cheerLog = useStudyStore((s) => s.cheerLog);

  const messages = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!supabase) return CHAT_MESSAGES.filter((m) => m.roomId === roomId);
      const { data, error } = await supabase
        .from("chat_messages")
        .select(MESSAGE_FIELDS)
        .eq("room_id", roomId)
        .is("deleted_at", null)
        // 최신 200개를 받은 뒤 시간순으로 뒤집는다. 오름차순으로 자르면 가장 오래된 200개만 보인다.
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as unknown as MessageRow[]).reverse().map(toMessage);
    },
  });

  // DB 트리거(realtime.broadcast_changes)가 room:<id>:messages 토픽으로 변경을 보낸다
  useEffect(() => {
    if (!supabase) return;
    const refetch = () =>
      queryClient.invalidateQueries({ queryKey: ["chat", roomId] });
    const channel = supabase
      .channel(`room:${roomId}:messages`, { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, refetch)
      .on("broadcast", { event: "DELETE" }, refetch)
      .subscribe();
    void supabase.realtime.setAuth();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, roomId, queryClient]);

  const update = (change: (prev: ChatMessage[]) => ChatMessage[]) =>
    queryClient.setQueryData<ChatMessage[]>(key, (prev = []) => change(prev));
  const refetch = () => void queryClient.invalidateQueries({ queryKey: key });

  const send = useMutation({
    mutationFn: async (content: string) => {
      const clientId = crypto.randomUUID();
      if (supabase) {
        await requestJson("/api/chat/messages", { partyId, roomId, content, clientId });
        return;
      }
      // 데모: 로컬에만 붙이고, @AI 질문이면 잠시 뒤 예시 답변을 단다
      const local: ChatMessage = {
        id: clientId,
        roomId,
        senderId: me.id,
        senderName: me.name,
        initial: me.initial,
        content,
        createdAt: new Date().toISOString(),
        kind: "text",
        replyTo: null,
        logId: null,
        confirmedBy: [],
        cheeredBy: [],
      };
      update((prev) => [...prev, local]);
      if (parseAiMention(content))
        setTimeout(
          () =>
            update((prev) => [
              ...prev,
              {
                ...local,
                id: crypto.randomUUID(),
                content: DEMO_AI_ANSWER,
                createdAt: new Date().toISOString(),
                kind: "ai",
                replyTo: local.id,
              },
            ]),
          1500,
        );
    },
    onSuccess: () => {
      if (supabase) refetch();
    },
  });

  const confirm = useMutation({
    mutationFn: async ({ messageId, confirmed }: { messageId: string; confirmed: boolean }) => {
      if (supabase) {
        await requestJson("/api/chat/confirm", { roomId, messageId, confirmed });
        return;
      }
      const others = (m: ChatMessage) => m.confirmedBy.filter((c) => c.id !== me.id);
      update((prev) =>
        prev.map((m) =>
          m.id !== messageId
            ? m
            : {
                ...m,
                confirmedBy: confirmed
                  ? [...others(m), { id: me.id, name: me.name }]
                  : others(m),
              },
        ),
      );
    },
    onSuccess: () => {
      if (supabase) refetch();
    },
  });

  /** 인증 알림 축하 — 학습 기록에 축하를 남긴다 (홈 피드·트래커와 같은 반응) */
  const cheer = async (message: ChatMessage) => {
    if (!message.logId || message.cheeredBy.includes(me.id)) return;
    if (!supabase) {
      update((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, cheeredBy: [...m.cheeredBy, me.id] } : m,
        ),
      );
      return;
    }
    if (await cheerLog(message.logId)) refetch();
  };

  return {
    messages: messages.data ?? [],
    isLoading: messages.isLoading,
    send,
    confirm,
    cheer,
    myId: me.id,
  };
}
