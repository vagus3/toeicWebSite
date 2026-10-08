"use client";

import { Plus, Sparkle } from "@phosphor-icons/react";
import { Avatar } from "@/components/shared/avatar";
import { MessageComposer } from "@/components/shared/message-composer";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";

/** 질문 창구 — 스레드 목록 + AI 초안 답변 + 파티원 보충 */
export function QnaBoard() {
  const threads = useStudyStore((s) => s.threads);
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
          <Button variant="primary" className="text-meta" onClick={openQuestion}>
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
            className={cn("flex cursor-pointer flex-col gap-1 rounded-md p-3 text-left", t.id === thread?.id ? "bg-surface" : "bg-transparent")}
          >
            <span className="flex items-center gap-1.5">
              <span className="tag tag-neutral">{t.tag}</span>
              <span className="text-label text-muted">{t.who}</span>
            </span>
            <span className="text-body leading-snug">{t.title}</span>
            <span className="flex items-center gap-1 text-label text-accent-300">
              <Sparkle /> AI 초안 · 보충 {t.replies.length}
            </span>
          </button>
        ))}
      </div>

      {thread && (
        <article className="flex max-w-thread min-w-0 flex-1 basis-col-thread flex-col gap-4">
          <span className="text-label text-muted">
            {thread.tag} · {thread.who}
          </span>
          <h2 className="m-0 text-title leading-question font-normal tracking-normal md:text-heading">{thread.title}</h2>
          <div className="flex flex-col gap-2 rounded-md bg-accent-900 p-3.5 md:p-4">
            <span className="flex items-center gap-1.5 text-label text-accent-300">
              <Sparkle />
              AI 초안 답변
            </span>
            <p className="m-0 text-meta leading-reading md:text-body">{thread.ai}</p>
          </div>
          {thread.replies.map((r, i) => (
            <div key={i} className="flex gap-2.5">
              <Avatar initial={r.initial} size="sm" />
              <div className="flex flex-col gap-1">
                <span className="text-label">
                  <b className="font-medium">{r.name}</b> <span className="tag tag-accent px-1.5 py-px text-micro">보충</span>
                </span>
                <span className="text-meta leading-normal md:text-body">{r.text}</span>
              </div>
            </div>
          ))}
          <MessageComposer placeholder="보충 답변 달기 (Enter)" label="보충 답변" maxLength={1000} onSend={(text) => addReply(thread.id, text)} />
        </article>
      )}
    </div>
  );
}
