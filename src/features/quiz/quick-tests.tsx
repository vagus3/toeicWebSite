"use client";

import Link from "next/link";
import { ActionCard } from "@/components/shared/action-card";
import { Button } from "@/components/ui/button";
import { QUIZ } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";

/** 홈 하단 — 일일 테스트 시작 / 주간 점수 입력 바로가기 */
export function QuickTests() {
  const openScore = useStudyStore((s) => s.openScore);
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(var(--spacing-card-min),1fr))] gap-3">
      <ActionCard
        kicker="일일 테스트 · AI 출제"
        title={`단어 Day 12 · ${QUIZ.length}문항`}
        action={
          <Button asChild variant="primary" className="text-meta">
            <Link href={ROUTES.dailyQuiz}>시작</Link>
          </Button>
        }
      />
      <ActionCard
        kicker="주간 테스트 · 토"
        title="하프 모의고사 점수 입력"
        action={
          <Button variant="secondary" className="text-meta" onClick={openScore}>
            입력
          </Button>
        }
      />
    </div>
  );
}
