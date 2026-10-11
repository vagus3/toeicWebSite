"use client";

import { Plus, Sparkle } from "@phosphor-icons/react";
import { Avatar } from "@/components/shared/avatar";
import { MessageComposer } from "@/components/shared/message-composer";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { AiConversation } from "./ai-conversation";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";

/** 질문별 AI 대화와 파티원 댓글을 함께 보여준다. */
export function QnaBoard() {
  const threads = useStudyStore((s) => s.threads);
  const saving = useStudyStore((s) => s.saving);
  const addReply = useStudyStore((s) => s.addReply);
  const openQuestion = useStudyStore((s) => s.openQuestion);
  const selectedId = useStudyStore((s) => s.activeThreadId);
  const setSelectedId = useStudyStore((s) => s.setActiveThread);
  const thread = threads.find((t) => t.id === selectedId) ?? threads[0];

  return (
    <div className="flex flex-wrap items-start gap-6 md:gap-8">
      <div className="flex min-w-col-min flex-1 flex-col gap-1 md:flex-none md:shrink md:basis-col-threads">
        <div className="mb-2 flex items-center justify-between">
          <PageTitle>질문 창구</PageTitle>
          <Button
            variant="primary"
            className="text-meta"
            onClick={openQuestion}
          >
            <Plus />
            질문
          </Button>
        </div>
        {threads.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            aria-pressed={t.id === thread?.id}
            className={cn(
              "flex cursor-pointer flex-col gap-1 rounded-md p-3 text-left",
              t.id === thread?.id ? "bg-surface" : "bg-transparent",
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className="tag tag-neutral">{t.tag}</span>
              <span className="text-label text-muted">{t.who}</span>
            </span>
            <span className="line-clamp-3 break-words text-body leading-snug">{t.title}</span>
            <span className="flex items-center gap-1 text-label text-accent-300">
              <Sparkle /> AI 대화 {t.aiTurns?.length ?? 0} · 댓글 {t.replies.length}
            </span>
          </button>
        ))}
      </div>

      {!thread && <p className="text-muted">아직 질문이 없어요. 질문을 올려 AI와 파티원에게 물어보세요.</p>}
      {thread && (
        <article className="flex max-w-thread min-w-0 flex-1 basis-col-thread flex-col gap-4">
          <span className="text-label text-muted">
            {thread.tag} · {thread.who}
          </span>
          <h2 className="m-0 whitespace-pre-wrap break-words text-title leading-question font-normal tracking-normal md:text-heading">
            {thread.title}
          </h2>
          <AiConversation key={thread.id} thread={thread} />
          <h3 className="m-0 text-body">파티원 댓글 · {thread.replies.length}</h3>
          {!thread.replies.length && <p className="m-0 text-meta text-muted">설명이나 다른 풀이를 댓글로 남겨 주세요.</p>}
          {thread.replies.map((r, i) => (
            <div key={i} className="flex gap-2.5">
              <Avatar initial={r.initial} size="sm" />
              <div className="flex flex-col gap-1">
                <span className="text-label">
                  <b className="font-medium">{r.name}</b>{" "}
                  <span className="tag tag-accent px-1.5 py-px text-micro">
                    댓글
                  </span>
                </span>
                <span className="whitespace-pre-wrap break-words text-meta leading-normal md:text-body">
                  {r.text}
                </span>
              </div>
            </div>
          ))}
          <MessageComposer
            key={thread.id}
            disabled={saving}
            placeholder="파티원에게 댓글 남기기 (Enter)"
            label="파티원 댓글"
            maxLength={1000}
            onSend={async (text) => {
              if (!(await addReply(thread.id, text))) return false;
            }}
          />
        </article>
      )}
    </div>
  );
}
