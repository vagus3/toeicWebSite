"use client";

import { DEMO_TODAY, MEMBERS, PARTY } from "@/lib/demo-data";
import { dDay } from "@/lib/utils";
import { useDoneCount, useLatestScore } from "@/stores/study-store";
import type { Member } from "@/types";

/** 파티 이름 · 시험까지 남은 날 · "4 / 6명 · D-17" */
export function usePartySummary() {
  const days = dDay(DEMO_TODAY, PARTY.examDate);
  return { name: PARTY.name, dDay: days, summary: `${MEMBERS.length} / ${PARTY.capacity}명 · D-${days}` };
}

/** 내 행은 오늘 인증 수와 최근 점수에 따라 바뀐다 (시안: 78% 기준 인증 1건당 ±5%) */
export function useMembers(): Member[] {
  const doneCount = useDoneCount();
  const latest = useLatestScore();
  return MEMBERS.map((m) => (m.isMe ? { ...m, quota: 78 + (doneCount - 2) * 5, score: latest } : m));
}

/** 오늘 아직 시작 안 한(연속 0일) 멤버 — 콕 찌르기 대상 */
export function isLazy(member: Member) {
  return member.streak === 0;
}

export function lazyMember(members: Member[]) {
  return members.find(isLazy) ?? null;
}

/** "형규 (나)" */
export function memberLabel(member: Member) {
  return member.isMe ? `${member.name} (나)` : member.name;
}

export function bookPercent(member: Member) {
  return Math.round((member.book.done / member.book.total) * 100);
}
