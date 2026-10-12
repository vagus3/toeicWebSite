"use client";

import { CaretLeft, Confetti, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { AiConfirm } from "@/components/shared/ai-confirm";
import { AiText } from "@/components/shared/ai-text";
import { Avatar } from "@/components/shared/avatar";
import { MessageComposer } from "@/components/shared/message-composer";
import { PinnedFooter } from "@/components/shared/pinned-footer";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { HttpError } from "@/lib/http";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { useToast } from "@/stores/toast-store";
import type { ChatMessage } from "@/types";
import { parseAiMention } from "./ai-mention";
import { AI_PENDING_MS, isAiQuestion, onlyQuestions, pendingAiIds } from "./chat-view";
import { PushToggle } from "./push-toggle";
import { useChatRoom } from "./use-chat-room";

type Filter = "all" | "questions";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "questions", label: "질문만" },
];
const AI_PREFIX = /^\s*[@＠]ai(?![a-z0-9])/i;

const time = (iso: string) => format(new Date(iso), "HH:mm");

function sendError(error: unknown, text: string) {
  if (error instanceof HttpError) {
    if (error.message.includes("ai_limit_reached"))
      return "오늘 AI 질문 횟수를 모두 사용했어요. 내일 다시 물어봐 주세요";
    if (error.message.includes("ai_not_configured"))
      return "AI 연결이 준비되지 않았어요. @AI 없이 보내 주세요";
    if (error.status === 429)
      return "메시지를 너무 빨리 보내고 있어요. 잠시 후 다시 보내 주세요";
  }
  return parseAiMention(text)
    ? "질문을 보내지 못했어요. 다시 시도해 주세요"
    : "메시지를 보내지 못했어요. 다시 시도해 주세요";
}

/** 시간이 지나면 "답변 준비 중" 표시를 거두도록 가끔 다시 그린다 */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function TextMessage({
  message,
  mine,
  pending,
}: {
  message: ChatMessage;
  mine: boolean;
  pending: boolean;
}) {
  const question = isAiQuestion(message);
  return (
    <li className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
      {!mine && <Avatar initial={message.initial} size="sm" />}
      <div className={cn("flex max-w-4/5 min-w-0 flex-col gap-1", mine && "items-end")}>
        {(!mine || question) && (
          <span className="text-label">
            {!mine && <span className="font-medium">{message.senderName}</span>}
            {question && (
              <span className="text-accent-300">{mine ? "AI에게 질문" : " · AI에게 질문"}</span>
            )}
          </span>
        )}
        <div className={cn("flex items-end gap-1.5", mine && "flex-row-reverse")}>
          <p
            className={cn(
              "m-0 min-w-0 whitespace-pre-wrap break-words rounded-md px-3.5 py-2.5 text-body leading-normal",
              mine ? "bg-accent-900" : "bg-surface shadow-sm",
            )}
          >
            {message.content}
          </p>
          <time dateTime={message.createdAt} className="shrink-0 text-caption text-muted">
            {time(message.createdAt)}
          </time>
        </div>
        {pending && (
          <span role="status" className="flex items-center gap-1 text-label text-accent-300">
            <Sparkle aria-hidden />
            AI가 답변을 준비하고 있어요…
          </span>
        )}
      </div>
    </li>
  );
}

function AiMessage({
  message,
  question,
  myId,
  confirming,
  onConfirm,
}: {
  message: ChatMessage;
  question: ChatMessage | undefined;
  myId: string;
  confirming: boolean;
  onConfirm: (confirmed: boolean) => void;
}) {
  return (
    <li className="flex gap-2.5">
      <span
        aria-hidden
        className="grid size-7 flex-none place-items-center rounded-full bg-accent-800 text-accent-100"
      >
        <Sparkle />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-label">
          <span className="font-medium">AI</span>
          {question && (
            <span className="text-muted"> · {question.senderName}님 질문에 답했어요</span>
          )}
        </span>
        <div className="flex flex-col gap-2.5 rounded-md border border-divider bg-surface px-3.5 py-3">
          <AiText text={message.content} />
          <AiConfirm
            confirmedBy={message.confirmedBy}
            myId={myId}
            pending={confirming}
            onToggle={onConfirm}
          />
        </div>
        <time dateTime={message.createdAt} className="text-caption text-muted">
          {time(message.createdAt)}
        </time>
      </div>
    </li>
  );
}

function StudyEvent({
  message,
  mine,
  cheered,
  onCheer,
}: {
  message: ChatMessage;
  mine: boolean;
  cheered: boolean;
  onCheer: () => void;
}) {
  const count = message.cheeredBy.length;
  return (
    <li className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-label text-muted">
      <span>
        {mine ? "내가" : `${message.senderName}님이`} {message.content}을 올렸어요 ·{" "}
        {time(message.createdAt)}
      </span>
      {mine ? (
        count > 0 && <span>축하 {count}</span>
      ) : (
        <Button
          variant={cheered ? "secondary" : "ghost"}
          className="px-2 py-1 text-label"
          aria-pressed={cheered}
          disabled={cheered}
          onClick={onCheer}
        >
          <Confetti aria-hidden />
          축하{count > 0 && ` ${count}`}
        </Button>
      )}
    </li>
  );
}

/** 파티 그룹 채팅 — 발신자 표시, 실시간 수신, 새 메시지 푸시, @AI 질문, 인증 알림 */
export function ChatRoom({
  partyId,
  roomId,
}: {
  partyId: string;
  roomId: string;
}) {
  const party = useStudyStore((s) => s.party);
  const count = useStudyStore((s) => s.members.length);
  const flash = useToast((s) => s.flash);
  const { messages, isLoading, send, confirm, cheer, myId } = useChatRoom(partyId, roomId);
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const now = useNow(AI_PENDING_MS / 6);
  const endRef = useRef<HTMLDivElement>(null);

  const pending = pendingAiIds(messages, now);
  const shown = filter === "all" ? messages : onlyQuestions(messages);
  const byId = new Map(messages.map((m) => [m.id, m]));

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [shown.length, filter]);

  return (
    <div className="flex w-full max-w-thread flex-1 flex-col gap-4">
      <ScreenHeader
        leading={{ href: ROUTES.dashboard, label: "홈으로", icon: CaretLeft }}
        title="파티 채팅"
        subtitle={`${party?.name ?? ""} · ${count}명`}
        trailing={<PushToggle compact />}
        below={
          <div role="radiogroup" aria-label="메시지 보기" className="seg self-start">
            {FILTERS.map((option) => (
              <label key={option.value} className="seg-opt">
                <input
                  type="radio"
                  name="chat-filter"
                  value={option.value}
                  checked={filter === option.value}
                  onChange={() => setFilter(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        }
      />

      <ol
        aria-live="polite"
        aria-busy={isLoading}
        className="m-0 flex list-none flex-col gap-4 p-0"
      >
        {shown.map((m) => {
          if (m.kind === "ai")
            return (
              <AiMessage
                key={m.id}
                message={m}
                question={m.replyTo ? byId.get(m.replyTo) : undefined}
                myId={myId}
                confirming={confirm.isPending && confirm.variables?.messageId === m.id}
                onConfirm={(confirmed) =>
                  confirm.mutate(
                    { messageId: m.id, confirmed },
                    { onError: () => flash("확인을 저장하지 못했어요. 다시 시도해 주세요") },
                  )
                }
              />
            );
          if (m.kind === "system" && m.logId)
            return (
              <StudyEvent
                key={m.id}
                message={m}
                mine={m.senderId === myId}
                cheered={m.cheeredBy.includes(myId)}
                onCheer={() => void cheer(m)}
              />
            );
          if (m.kind === "system")
            return (
              <li key={m.id} className="flex items-center gap-1.5 pl-9 text-label text-muted">
                <WarningCircle aria-hidden className="shrink-0" />
                {m.content}
              </li>
            );
          return (
            <TextMessage
              key={m.id}
              message={m}
              mine={m.senderId === myId}
              pending={pending.has(m.id)}
            />
          );
        })}
      </ol>
      {!isLoading && shown.length === 0 && (
        <p className="m-0 text-meta text-muted">
          {filter === "questions"
            ? "아직 AI에게 한 질문이 없어요. @AI로 시작해서 물어보세요."
            : "첫 메시지를 보내 보세요."}
        </p>
      )}

      <PinnedFooter keyboardAware>
        <MessageComposer
          value={draft}
          onValueChange={setDraft}
          placeholder="메시지 보내기"
          label="메시지"
          disabled={send.isPending}
          leading={
            <Button
              variant="secondary"
              className="px-2.5 text-meta"
              aria-label="AI에게 질문하기 (입력창 앞에 @AI를 붙여요)"
              onClick={() =>
                setDraft((current) =>
                  AI_PREFIX.test(current) ? current : `@AI ${current.trimStart()}`,
                )
              }
            >
              @AI
            </Button>
          }
          hint="@AI로 시작하면 AI가 먼저 답해요. 질문은 Groq에 전달되니 개인정보는 쓰지 마세요."
          onSend={async (text) => {
            try {
              await send.mutateAsync(text);
            } catch (error) {
              flash(sendError(error, text));
              return false;
            }
          }}
        />
      </PinnedFooter>
      {/* 입력창 뒤(페이지 맨 끝)에 둔다. 입력창 앞에 두면 마지막 메시지가 고정된 입력창에 가려진다 */}
      <div ref={endRef} />
    </div>
  );
}
