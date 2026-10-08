"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { ME, PARTY, TASKS } from "@/lib/demo-data";
import { usePartySummary } from "@/features/party/use-party";
import { useDoneCount, useLatestScore } from "@/stores/study-store";

export function TodayProgress({ className }: { className?: string }) {
  const doneCount = useDoneCount();
  return (
    <div className={className}>
      <div className="flex justify-between text-meta">
        <span>오늘 진행률</span>
        <span className="text-accent-300">
          {doneCount} / {TASKS.length}
        </span>
      </div>
      <ProgressBar value={(doneCount / TASKS.length) * 100} glow label="오늘 진행률" />
    </div>
  );
}

/** 시험까지 남은 날 · 최근 점수 */
function useExamSummary() {
  const { dDay } = usePartySummary();
  const latest = useLatestScore();
  return { dDay, latest: latest ?? "—" };
}

/** 데스크톱 홈 상단 — D-day · 최근 점수 → 목표 · 오늘 진행률 */
export function TodayHeaderDesktop() {
  const { dDay, latest } = useExamSummary();
  return (
    <div className="flex flex-wrap items-end gap-8">
      <div className="flex flex-col gap-1">
        <span className="text-meta text-muted">{PARTY.examLabel}</span>
        <span className="text-display leading-none font-medium tracking-display">D-{dDay}</span>
      </div>
      <div className="flex flex-col gap-1 pb-1.5">
        <span className="text-meta text-muted">최근 점수 → 목표</span>
        <span className="text-stat">
          {latest} <span className="text-muted">→</span> <span className="text-accent-300">{ME.target}</span>
        </span>
      </div>
      <TodayProgress className="flex max-w-progress-max min-w-progress-min flex-1 flex-col gap-1.5 pb-2.5" />
    </div>
  );
}

/** 모바일 홈 상단 (프로토타입) */
export function TodayHeaderMobile() {
  const { dDay, latest } = useExamSummary();
  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-meta text-muted">{PARTY.examLabel}</span>
        <div className="flex items-baseline gap-2.5">
          <span className="text-hero leading-none font-medium tracking-display">D-{dDay}</span>
          <span className="text-meta text-accent-300">
            {latest} → 목표 {ME.target}
          </span>
        </div>
      </div>
      <TodayProgress className="flex flex-col gap-1.5" />
    </>
  );
}
