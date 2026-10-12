"use client";

import { Sparkle } from "@phosphor-icons/react";
import { AiConfirm } from "@/components/shared/ai-confirm";
import { AiText } from "@/components/shared/ai-text";
import type { QnaThread } from "@/types";

/**
 * 질문의 AI 답변 — 첫 답변과 이어진 AI 대화. 답변마다 파티원 확인을 단다.
 * 입력은 질문 상세 아래의 고정 입력창 하나에서 [AI에게]를 골라 한다.
 */
export function AiAnswers({
  thread,
  myId,
  pending,
  confirming,
  onConfirm,
}: {
  thread: QnaThread;
  myId: string;
  /** AI에게 이어서 물어본 답을 기다리는 중 */
  pending: boolean;
  confirming: boolean;
  /** turnId가 null이면 첫 AI 답변 */
  onConfirm: (turnId: string | null, confirmed: boolean) => void;
}) {
  return (
    <section
      aria-label="AI 답변"
      className="flex flex-col gap-4 rounded-md bg-accent-900 p-3.5 md:p-4"
    >
      <h3 className="m-0 flex items-center gap-1.5 text-body text-accent-300">
        <Sparkle aria-hidden /> AI 답변
      </h3>
      {thread.ai ? (
        <div className="flex flex-col gap-2.5">
          <AiText text={thread.ai} />
          <AiConfirm
            confirmedBy={thread.aiConfirmedBy ?? []}
            myId={myId}
            pending={confirming}
            onToggle={(confirmed) => onConfirm(null, confirmed)}
          />
        </div>
      ) : (
        <p className="m-0 text-meta text-muted">
          아직 AI 답변이 없어요. 아래에서 [AI에게]를 골라 물어보세요.
        </p>
      )}
      {(thread.aiTurns ?? []).map((turn) => (
        <div key={turn.id} className="flex flex-col gap-2.5 border-t border-divider pt-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-label text-muted">{turn.name}의 질문</span>
            <p className="m-0 whitespace-pre-wrap break-words text-meta leading-reading md:text-body">
              {turn.prompt}
            </p>
          </div>
          <span className="text-label text-accent-300">AI 답변</span>
          <AiText text={turn.answer} />
          <AiConfirm
            confirmedBy={turn.confirmedBy ?? []}
            myId={myId}
            pending={confirming}
            onToggle={(confirmed) => onConfirm(turn.id, confirmed)}
          />
        </div>
      ))}
      {pending && (
        <p role="status" className="m-0 flex items-center gap-1.5 text-meta text-accent-300">
          <Sparkle aria-hidden />
          이전 대화를 참고해 AI가 답변을 만들고 있어요…
        </p>
      )}
    </section>
  );
}
