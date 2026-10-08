import { DEMO_TODAY, demoLevel, MEMBERS, TRACKER_START } from "@/lib/demo-data";

/** 할당량 달성 단계(0–4)별 칸 색 — 범례와 같은 순서 */
export const LEVEL_CLASS = [
  "bg-neutral-800",
  "bg-accent-800",
  "bg-accent-700",
  "bg-accent-600",
  "bg-accent-500",
] as const;

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export interface TrackerMonth {
  year: number;
  month: number;
}

export function buildMonth({ year, month }: TrackerMonth) {
  const nDays = new Date(year, month + 1, 0).getDate();
  const isCurrent = year === DEMO_TODAY.getFullYear() && month === DEMO_TODAY.getMonth();
  const lastDay = isCurrent ? DEMO_TODAY.getDate() : nDays;

  let sum = 0;
  let count = 0;
  const rows = MEMBERS.map((member, r) => ({
    member,
    cells: Array.from({ length: nDays }, (_, d) => {
      const future = d + 1 > lastDay;
      const level = future ? 0 : demoLevel(r, year, month, d);
      if (!future) {
        sum += level;
        count += 1;
      }
      return { day: d + 1, future, level };
    }),
  }));

  return {
    nDays,
    isCurrent,
    lastDay,
    rows,
    todayDay: isCurrent ? DEMO_TODAY.getDate() : null,
    average: count ? `${Math.round((sum / count) * 25)}%` : "—",
    canPrev: !(year === TRACKER_START.year && month === TRACKER_START.month),
    canNext: !isCurrent,
  };
}

export function shiftMonth({ year, month }: TrackerMonth, delta: number): TrackerMonth {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** 칸 상세 — 단계별로 어떤 할당량을 채웠는지 */
export function dayDetail(memberIndex: number, { year, month }: TrackerMonth, dayIndex: number) {
  const level = demoLevel(memberIndex, year, month, dayIndex);
  const dow = DOW[new Date(year, month, dayIndex + 1).getDay()];
  const bookFallback = ["0", "—", "—", "✓", "✓"][level];
  return {
    title: `${MEMBERS[memberIndex].name} · ${month + 1}월 ${dayIndex + 1}일 (${dow})`,
    name: MEMBERS[memberIndex].name,
    member: MEMBERS[memberIndex],
    pct: `${level * 25}%`,
    word: level >= 1 ? "48/50" : "—",
    lc: level >= 2 ? "13/15" : "—",
    rc: level >= 3 ? "11/15" : "—",
    book: level >= 4 ? "Ch 완료" : bookFallback,
  };
}
