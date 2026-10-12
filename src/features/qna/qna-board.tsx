"use client";

import { CaretRight, CheckCircle, Plus, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";
import type { QnaThread } from "@/types";

/** AI 답변 중 하나라도 파티원이 확인했는지 */
function hasConfirmation(thread: QnaThread) {
  return Boolean(
    thread.aiConfirmedBy?.length ||
      thread.aiTurns?.some((turn) => turn.confirmedBy?.length),
  );
}

/** 질문 목록 — 누르면 질문 상세(/qna/[id])로 간다. 뒤로가기·링크 공유가 그대로 된다. */
export function QnaBoard() {
  const threads = useStudyStore((s) => s.threads);
  const openQuestion = useStudyStore((s) => s.openQuestion);

  return (
    <div className="flex w-full max-w-thread flex-col gap-4">
      <div className="mb-2 flex items-center justify-between">
        <PageTitle>질문 창구</PageTitle>
        <Button variant="primary" className="text-meta" onClick={() => openQuestion()}>
          <Plus />
          질문
        </Button>
      </div>
      {threads.length ? (
        <ul aria-label="질문 목록" className="m-0 flex list-none flex-col gap-2 p-0">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={ROUTES.qnaThread(t.id)}
                className="card flex flex-col gap-1 rounded-md p-3 text-left text-text no-underline hover:bg-surface"
              >
                <span className="flex items-center gap-1.5">
                  <span className="tag tag-neutral">{t.tag}</span>
                  <span className="text-label text-muted">{t.who}</span>
                </span>
                <span className="flex w-full items-center gap-2">
                  <span className="line-clamp-2 min-w-0 flex-1 break-words text-body leading-snug">
                    {t.title}
                  </span>
                  <CaretRight aria-hidden className="shrink-0 text-muted" />
                </span>
                <span className="flex flex-wrap items-center gap-1 text-label text-accent-300">
                  <Sparkle aria-hidden /> AI 대화 {t.aiTurns?.length ?? 0} · 파티원 답변{" "}
                  {t.replies.length}
                  {hasConfirmation(t) && (
                    <>
                      {" "}
                      · <CheckCircle weight="fill" aria-hidden /> 확인됨
                    </>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">아직 질문이 없어요. 질문을 올려 AI와 파티원에게 물어보세요.</p>
      )}
    </div>
  );
}
