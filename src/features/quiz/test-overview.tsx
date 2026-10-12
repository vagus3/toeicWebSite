"use client";

import { LockSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { ActionCard } from "@/components/shared/action-card";
import { PageTitle } from "@/components/shared/page-title";
import { SectionTitle } from "@/components/shared/section-title";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";
import { ScoreChart } from "./score-chart";
import { useReviewItems } from "@/features/review/use-review";

const CARD = "md:p-4";
const TITLE = "text-body md:text-base";

/** 테스트 — 일일/주간/월간 + 내 점수 추이 */
export function TestOverview() {
  const me = useStudyStore((s) => s.me);
  const openScore = useStudyStore((s) => s.openScore);
  const scores = useStudyStore((s) => s.scores);
  const review = useReviewItems();

  return (
    <div className="flex flex-wrap items-start gap-10">
      <div className="flex min-w-0 flex-1 basis-col-half flex-col gap-3">
        <PageTitle className="mb-1 md:mb-2">테스트</PageTitle>
        <ActionCard
          highlight
          className={CARD}
          titleClassName={TITLE}
          kicker="일일 LC · 해커스에서 듣기 풀이"
          title="해커스 LC 채점표 제출"
          description="결과 이미지 읽기 · 점수·문항별 결과 저장 · LC 인증"
          action={<Button asChild variant="primary"><Link href={ROUTES.hackersLc}>풀기 / 제출</Link></Button>}
        />
        <ActionCard
          highlight
          className={CARD}
          titleClassName={TITLE}
          kicker="일일 RC · 해커스에서 풀이"
          title="해커스 채점표 제출"
          description="결과 이미지 읽기 · 점수·문항별 결과 저장 · RC 인증"
          action={<Button asChild variant="primary"><Link href={ROUTES.hackersRc}>풀기 / 제출</Link></Button>}
        />
        <ActionCard
          className={CARD}
          titleClassName={TITLE}
          kicker="일일 단어 · 해커스에서 시험 응시"
          title="해커스 단어 시험 결과 제출"
          description="해커스에서 원하는 시험 생성·응시 · 결과지·스크린샷 제출 · 단어 인증"
          action={
            <Button asChild variant="primary">
              <Link href={ROUTES.hackersWord}>응시 / 결과 제출</Link>
            </Button>
          }
        />
        <ActionCard
          className={CARD}
          titleClassName={TITLE}
          kicker="복습 · 나만 보기"
          title="오답노트"
          description={
            review.data
              ? `복습할 문제 ${review.data.items.filter((i) => !i.reviewed).length}개 · 제출한 채점표와 기존 기록의 오답`
              : "제출한 채점표와 기존 기록에서 틀린 문제를 모아 다시 풀어요"
          }
          action={<Button asChild variant="secondary"><Link href={ROUTES.review}>복습하기</Link></Button>}
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
          action={
            <LockSimple className="text-muted" aria-label="아직 열리지 않음" />
          }
        />
      </div>

      <div className="flex min-w-0 flex-1 basis-col-half flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <SectionTitle>내 점수 추이</SectionTitle>
          <span className="text-label text-muted">목표 {me.target}</span>
        </div>
        <ScoreChart scores={scores} />
        <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {scores.map((s, i) => (
            <li key={`${s.label}-${i}`} className="tag tag-neutral">
              {s.label} · {s.value}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
