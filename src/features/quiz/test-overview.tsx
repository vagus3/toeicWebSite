"use client";

import { LockSimple } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ActionCard } from "@/components/shared/action-card";
import { PageTitle } from "@/components/shared/page-title";
import { SectionTitle } from "@/components/shared/section-title";
import { Button } from "@/components/ui/button";
import { TaskStatusIcon } from "@/features/study/task-status-icon";
import { SOURCE_LABEL, weakestSource } from "@/features/review/review-model";
import { useReviewItems } from "@/features/review/use-review";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";
// recharts(약 350KB)는 점수 그래프를 여는 화면에서만 받는다 — 다른 화면의 첫 실행을 무겁게 하지 않도록
const ScoreChart = dynamic(
  () => import("./score-chart").then((m) => m.ScoreChart),
  { ssr: false, loading: () => null },
);

const CARD = "md:p-4";
const TITLE = "text-body md:text-base";

/** 오늘 할 것 — 마치면 그날 항목이 자동 인증되는 테스트. 왼쪽 아이콘은 그 항목의 오늘 인증 여부다. */
function TodayTests() {
  const done = useStudyStore((s) => s.done);
  const status = (isDone: boolean) => (
    <TaskStatusIcon done={isDone} className="text-icon-md" todoClassName="text-muted" />
  );
  const go = (href: string, label: string) => (
    <Button asChild variant="primary">
      <Link href={href} prefetch={false}>{label}</Link>
    </Button>
  );
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>오늘 할 것</SectionTitle>
      <ActionCard
        highlight
        className={CARD}
        titleClassName={TITLE}
        leading={status(done.lc)}
        kicker="일일 LC · 해커스에서 듣기 풀이"
        title="해커스 LC 채점표 제출"
        description="결과 이미지 읽기 · 점수·문항별 결과 저장 · LC 인증"
        action={go(ROUTES.hackersLc, "풀기 / 제출")}
      />
      <ActionCard
        highlight
        className={CARD}
        titleClassName={TITLE}
        leading={status(done.rc)}
        kicker="일일 RC · 해커스에서 풀이"
        title="해커스 RC 채점표 제출"
        description="결과 이미지 읽기 · 점수·문항별 결과 저장 · RC 인증"
        action={go(ROUTES.hackersRc, "풀기 / 제출")}
      />
      <ActionCard
        className={CARD}
        titleClassName={TITLE}
        leading={status(done.word)}
        kicker="일일 단어 · 해커스에서 시험 응시"
        title="해커스 단어 시험 결과 제출"
        description="교재·Day 범위를 골라 응시 · PDF·스크린샷 제출 · 단어 인증"
        action={go(ROUTES.hackersWord, "풀기 / 제출")}
      />
    </section>
  );
}

/** 테스트 — 오늘 할 것 · 복습 · 주간/월간, 옆(모바일은 아래)에 점수 추이와 오답 통계 */
export function TestOverview() {
  const me = useStudyStore((s) => s.me);
  const openScore = useStudyStore((s) => s.openScore);
  const scores = useStudyStore((s) => s.scores);
  const review = useReviewItems();
  const items = review.data?.items ?? [];
  const pendingReview = items.filter((i) => !i.reviewed).length;
  const weakest = weakestSource(items);

  return (
    <div className="flex flex-wrap items-start gap-10">
      <div className="flex min-w-0 flex-1 basis-col-half flex-col gap-6">
        <PageTitle className="-mb-2">테스트</PageTitle>
        <TodayTests />

        <section className="flex flex-col gap-3">
          <SectionTitle>복습</SectionTitle>
          <ActionCard
            className={CARD}
            titleClassName={TITLE}
            kicker="복습 · 나만 보기"
            title="오답노트"
            description={
              review.data
                ? `복습할 문제 ${pendingReview}개 · 일일 RC·단어·해커스 오답`
                : "일일 RC·단어·해커스에서 틀린 문제를 모아 다시 풀어요"
            }
            action={
              <Button asChild variant="secondary">
                <Link href={ROUTES.review}>복습하기</Link>
              </Button>
            }
          />
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>주간 · 월간</SectionTitle>
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
            action={
              <LockSimple className="text-muted" aria-label="아직 열리지 않음" />
            }
          />
        </section>
      </div>

      <div className="flex min-w-0 flex-1 basis-col-half flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <SectionTitle>내 점수 추이</SectionTitle>
          <span className="text-label text-muted">목표 {me.target}</span>
        </div>
        {scores.length > 0 ? (
          <ScoreChart scores={scores} />
        ) : (
          <p className="m-0 text-meta text-muted">
            아직 점수 기록이 없어요. 주간 모의고사 점수를 입력하면 추이가 그려져요.
          </p>
        )}
        <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {scores.map((s, i) => (
            <li key={`${s.label}-${i}`} className="tag tag-neutral">
              {s.label} · {s.value}
            </li>
          ))}
        </ul>
        {/* 오답 통계 — 내 오답노트가 있을 때만 (실제 모드) */}
        {review.data && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card elev-sm gap-0.5 p-3.5">
              <span className="text-label text-muted">복습할 오답</span>
              <span className="text-stat font-medium">{pendingReview}개</span>
            </div>
            <div className="card elev-sm gap-0.5 p-3.5">
              <span className="text-label text-muted">약한 영역</span>
              <span className="text-stat font-medium">
                {weakest ? SOURCE_LABEL[weakest.source] : "—"}
              </span>
              {weakest && (
                <span className="text-label text-muted">복습 전 오답 {weakest.count}개</span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
