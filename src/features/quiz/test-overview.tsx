"use client";

import { LockSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { ActionCard } from "@/components/shared/action-card";
import { PageTitle } from "@/components/shared/page-title";
import { SectionTitle } from "@/components/shared/section-title";
import { Button } from "@/components/ui/button";
import { ME, QUIZ } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";
import { ScoreChart } from "./score-chart";

const CARD = "md:p-4";
const TITLE = "text-body md:text-base";

/** 테스트 — 일일/주간/월간 + 내 점수 추이 */
export function TestOverview() {
  const openScore = useStudyStore((s) => s.openScore);
  const scores = useStudyStore((s) => s.scores);
  const quizScore = useStudyStore((s) => s.quizScore);

  return (
    <div className="flex flex-wrap items-start gap-10">
      <div className="flex min-w-0 flex-1 basis-col-half flex-col gap-3">
        <PageTitle className="mb-1 md:mb-2">테스트</PageTitle>
        <ActionCard
          highlight
          className={CARD}
          titleClassName={TITLE}
          kicker="일일 · AI 출제"
          title={`단어 Day 12 · ${QUIZ.length}문항`}
          description="어제 틀린 단어 포함 · 끝나면 단어 자동 인증"
          action={
            <Button asChild variant="primary">
              <Link href={ROUTES.dailyQuiz}>시작</Link>
            </Button>
          }
        />
        <ActionCard
          className={CARD}
          titleClassName={TITLE}
          kicker="주간 · 토요일"
          title="LC/RC 하프 모의고사"
          description="교재 풀고 점수만 입력"
          action={
            <Button variant="secondary" onClick={openScore}>
              점수 입력
            </Button>
          }
        />
        <ActionCard
          className={CARD}
          titleClassName={TITLE}
          kicker="월간 · 10/31"
          kickerClassName="text-neutral-400"
          title="실전 모의고사 200문항"
          description="파티 전원 같은 회차"
          action={<LockSimple className="text-muted" aria-label="아직 열리지 않음" />}
        />
      </div>

      <div className="flex min-w-0 flex-1 basis-col-half flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <SectionTitle>내 점수 추이</SectionTitle>
          <span className="text-label text-muted">목표 {ME.target}</span>
        </div>
        <ScoreChart scores={scores} />
        <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {scores.map((s, i) => (
            <li key={`${s.label}-${i}`} className="tag tag-neutral">
              {s.label} · {s.value}
            </li>
          ))}
        </ul>
        {quizScore !== null && (
          <div className="card elev-sm gap-0.5 p-3.5">
            <span className="text-label text-muted">방금 일일 테스트</span>
            <span className="text-stat font-medium">
              {quizScore} / {QUIZ.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
