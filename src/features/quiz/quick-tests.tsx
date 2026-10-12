"use client";

import Link from "next/link";
import { ActionCard } from "@/components/shared/action-card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";

/** 홈 하단 — 일일 테스트 시작 / 주간 점수 입력 바로가기 */
export function QuickTests() {
  const openScore = useStudyStore((s) => s.openScore);
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(var(--spacing-card-min),1fr))] gap-3">
      <ActionCard
        kicker="일일 단어 · 해커스에서 시험 응시"
        title="해커스 단어 시험 결과 제출"
        action={
          <Button asChild variant="primary" className="text-meta">
            <Link href={ROUTES.hackersWord} prefetch={false}>응시 / 결과 제출</Link>
          </Button>
        }
      />
      <ActionCard
        kicker="일일 LC · 해커스 듣기 풀이"
        title="해커스 LC 채점표 제출"
        action={<Button asChild variant="primary" className="text-meta"><Link href={ROUTES.hackersLc} prefetch={false}>풀기 / 제출</Link></Button>}
      />
      <ActionCard
        kicker="일일 RC · 해커스 풀이"
        title="해커스 RC 채점표 제출"
        action={<Button asChild variant="primary" className="text-meta"><Link href={ROUTES.hackersRc} prefetch={false}>풀기 / 제출</Link></Button>}
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
