"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CHAT_MESSAGES, ME } from "@/lib/demo-data";
import { requestJson } from "@/lib/http";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/types";

interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: { nickname: string } | null;
}

function toMessage(row: MessageRow): ChatMessage {
  const name = row.profiles?.nickname ?? "파티원";
  return { id: row.id, roomId: row.room_id, senderId: row.sender_id, senderName: name, initial: name.slice(0, 1), content: row.content, createdAt: row.created_at };
}

/**
 * 채팅방 메시지 — DB(chat_messages)가 원본, Realtime Broadcast는 새 메시지 알림 용도.
 * Supabase 키가 없으면 데모 메시지로 로컬에서만 동작한다.
 */
export function useChatRoom(partyId: string, roomId: string) {
  const queryClient = useQueryClient();
  const key = ["chat", roomId];
  const supabase = getSupabaseBrowserClient();
  const [myId, setMyId] = useState(ME.id);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => data.user && setMyId(data.user.id));
  }, [supabase]);

  const messages = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!supabase) return CHAT_MESSAGES.filter((m) => m.roomId === roomId);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, room_id, sender_id, content, created_at, profiles(nickname)")
        .eq("room_id", roomId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data as unknown as MessageRow[]).map(toMessage);
    },
  });

  // DB 트리거(realtime.broadcast_changes)가 room:<id>:messages 토픽으로 INSERT를 보낸다
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`room:${roomId}:messages`, { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, () => queryClient.invalidateQueries({ queryKey: ["chat", roomId] }))
      .subscribe();
    void supabase.realtime.setAuth();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, roomId, queryClient]);

  const send = useMutation({
    mutationFn: async (content: string) => {
      const clientId = crypto.randomUUID();
      if (!supabase) {
        return { id: clientId, roomId, senderId: ME.id, senderName: ME.name, initial: ME.initial, content, createdAt: new Date().toISOString() } satisfies ChatMessage;
      }
      await requestJson("/api/chat/messages", { partyId, roomId, content, clientId });
      return null;
    },
    onSuccess: (local) => {
      if (local) queryClient.setQueryData<ChatMessage[]>(key, (prev = []) => [...prev, local]);
      else void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return { messages: messages.data ?? [], isLoading: messages.isLoading, send, myId };
}
