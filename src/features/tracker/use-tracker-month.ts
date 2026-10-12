"use client";

import { useState } from "react";
import { useStudyStore } from "@/stores/study-store";
import {
  buildMonth,
  dayDetail,
  shiftMonth,
  stepDay,
  type TrackerMonth,
} from "./tracker-data";

/**
 * 월간 트래커 상태 — 보는 달, 고른 칸(멤버 · 날짜), 그 칸의 상세.
 * 데스크톱 히트맵과 모바일 월간 잔디가 같이 쓴다.
 */
export function useTrackerMonth({ startOnMe = false } = {}) {
  const members = useStudyStore((s) => s.members);
  const logs = useStudyStore((s) => s.logs);
  const studyDate = useStudyStore((s) => s.studyDate);
  const party = useStudyStore((s) => s.party);
  const mode = useStudyStore((s) => s.mode);
  const today = new Date(`${studyDate}T12:00:00`);
  const source = {
    members,
    logs,
    studyDate,
    startDate: party?.createdAt ?? studyDate,
    mode,
  };
  const [ym, setYm] = useState<TrackerMonth>({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  // 모바일은 내 줄부터 보여 준다 (데스크톱은 첫 줄)
  const [cell, setCell] = useState<[number, number]>(() => [
    startOnMe ? Math.max(0, members.findIndex((m) => m.isMe)) : 0,
    today.getDate() - 1,
  ]);
  const month = buildMonth(ym, source);
  const memberIndex = Math.min(cell[0], Math.max(0, members.length - 1));
  const dayIndex = Math.min(cell[1], month.lastDay - 1);
  const detail = dayDetail(memberIndex, ym, dayIndex, source);

  return {
    ym,
    month,
    memberIndex,
    dayIndex,
    detail,
    mode,
    select: (member: number, day: number) => setCell([member, day]),
    selectMember: (member: number) => setCell(([, day]) => [member, day]),
    step: (delta: number) =>
      setCell(([member]) => [member, stepDay(dayIndex, delta, month.lastDay)]),
    move: (delta: number) => {
      setYm((cur) => shiftMonth(cur, delta));
      setCell(([member]) => [member, 0]);
    },
  };
}

export type TrackerMonthState = ReturnType<typeof useTrackerMonth>;
