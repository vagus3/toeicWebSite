"use client";

import { format } from "date-fns";
import { useEffect, useRef } from "react";
import { Avatar } from "@/components/shared/avatar";
import { MessageComposer } from "@/components/shared/message-composer";
import { PageTitle } from "@/components/shared/page-title";
import { MEMBERS, PARTY } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { PushToggle } from "./push-toggle";
import { useChatRoom } from "./use-chat-room";

function MessageItem({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <li className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
      {!mine && <Avatar initial={message.initial} size="sm" />}
      <div className={cn("flex max-w-4/5 flex-col gap-1", mine && "items-end")}>
        {!mine && <span className="text-label font-medium">{message.senderName}</span>}
        <div className={cn("flex items-end gap-1.5", mine && "flex-row-reverse")}>
          <p
            className={cn(
              "m-0 rounded-md px-3.5 py-2.5 text-body leading-normal",
              mine ? "bg-accent-900" : "bg-surface shadow-sm",
            )}
          >
            {message.content}
          </p>
          <time dateTime={message.createdAt} className="shrink-0 text-caption text-muted">
            {format(new Date(message.createdAt), "HH:mm")}
          </time>
        </div>
      </div>
    </li>
  );
}

/** 파티 그룹 채팅 — 발신자 표시, 실시간 수신, 새 메시지 푸시 */
export function ChatRoom({ partyId, roomId }: { partyId: string; roomId: string }) {
  const { messages, isLoading, send, myId } = useChatRoom(partyId, roomId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex max-w-thread flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-col">
          <PageTitle>파티 채팅</PageTitle>
          <span className="text-meta text-muted">
            {PARTY.name} · {MEMBERS.length}명
          </span>
        </div>
        <PushToggle />
      </div>

      <div className="hr my-0" />

      <ol
        aria-live="polite"
        aria-busy={isLoading}
        className="m-0 flex list-none flex-col gap-4 p-0"
      >
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} mine={m.senderId === myId} />
        ))}
      </ol>
      <div ref={endRef} />

      <MessageComposer
        placeholder="메시지 보내기 (Enter)"
        label="메시지"
        disabled={send.isPending}
        onSend={async (text) => {
          try {
            await send.mutateAsync(text);
          } catch {
            return false;
          }
        }}
      />
    </div>
  );
}
