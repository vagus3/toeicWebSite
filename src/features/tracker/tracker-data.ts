import { DEMO_TODAY, demoLevel, MEMBERS, TRACKER_START } from "@/lib/demo-data";
import type { Member } from "@/types";
import type { StudyLog } from "@/lib/study-model";
import { toStudyDate } from "@/lib/utils";

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
export interface TrackerSource {
  members: Member[];
  logs: StudyLog[];
  studyDate: string;
  startDate: string;
  mode: "live" | "demo";
}
const DEMO: TrackerSource = {
  members: MEMBERS,
  logs: [],
  studyDate: toStudyDate(DEMO_TODAY),
  startDate: toStudyDate(new Date(TRACKER_START.year, TRACKER_START.month, 1)),
  mode: "demo",
};
function dateKey({ year, month }: TrackerMonth, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function dayLogs(source: TrackerSource, memberId: string, date: string) {
  return source.logs.filter(
    (l) => l.user_id === memberId && l.study_date === date,
  );
}

export function buildMonth({ year, month }: TrackerMonth, source = DEMO) {
  const nDays = new Date(year, month + 1, 0).getDate();
  const current = new Date(`${source.studyDate}T12:00:00`);
  const isCurrent =
    year === current.getFullYear() && month === current.getMonth();
  const lastDay = isCurrent ? current.getDate() : nDays;
  let sum = 0,
    count = 0;
  // 동일 날짜에 사진을 여러 번 올려도 완료한 카테고리는 한 번만 센다.
  const categories = new Map<string, Set<string>>();
  for (const log of source.logs) {
    const key = `${log.user_id}:${log.study_date}`;
    if (!categories.has(key)) categories.set(key, new Set());
    categories.get(key)!.add(log.category);
  }
  const rows = source.members.map((member, r) => ({
    member,
    cells: Array.from({ length: nDays }, (_, d) => {
      const date = dateKey({ year, month }, d + 1);
      const future = date > source.studyDate;
      const level = future
        ? 0
        : source.mode === "demo"
          ? demoLevel(r, year, month, d)
          : (categories.get(`${member.id}:${date}`)?.size ?? 0);
      if (!future && date >= source.startDate.slice(0, 10)) {
        sum += level;
        count++;
      }
      return { day: d + 1, future, level };
    }),
  }));
  return {
    nDays,
    isCurrent,
    lastDay,
    rows,
    todayDay: isCurrent ? current.getDate() : null,
    average: count ? `${Math.round((sum / count) * 25)}%` : "—",
    canPrev:
      dateKey({ year, month }, 1).slice(0, 7) > source.startDate.slice(0, 7),
    canNext:
      dateKey({ year, month }, 1).slice(0, 7) < source.studyDate.slice(0, 7),
  };
}
/**
 * 하루 상세의 ‹ › 이동. 이번 달은 오늘(lastDay)까지만 갈 수 있다.
 * 모바일 월간 잔디는 칸이 작아서, 손가락 대신 이 버튼으로 하루씩 옮긴다.
 */
export function stepDay(dayIndex: number, delta: number, lastDay: number) {
  return Math.min(Math.max(dayIndex + delta, 0), lastDay - 1);
}

export function shiftMonth(
  { year, month }: TrackerMonth,
  delta: number,
): TrackerMonth {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
export function dayDetail(
  memberIndex: number,
  ym: TrackerMonth,
  dayIndex: number,
  source = DEMO,
) {
  const member = source.members[memberIndex] ?? source.members[0];
  const logs = dayLogs(source, member.id, dateKey(ym, dayIndex + 1));
  const categories = new Set(logs.map((l) => l.category));
  const level =
    source.mode === "demo"
      ? demoLevel(memberIndex, ym.year, ym.month, dayIndex)
      : categories.size;
  const value = (category: string, threshold: number) =>
    source.mode === "demo"
      ? level >= threshold
        ? "✓"
        : "—"
      : categories.has(category as StudyLog["category"])
        ? "인증 완료"
        : "—";
  return {
    title: `${member.name} · ${ym.month + 1}월 ${dayIndex + 1}일 (${DOW[new Date(ym.year, ym.month, dayIndex + 1).getDay()]})`,
    name: member.name,
    member,
    pct: `${level * 25}%`,
    word: value("word", 1),
    lc: value("lc", 2),
    rc: value("rc", 3),
    book: value("book", 4),
    logId: logs[0]?.id,
    /** 그날 올린 인증 사진(증빙이 있는 기록)의 id */
    evidenceLogs: logs
      .filter((l) => l.study_evidences?.length)
      .map((l) => ({ id: l.id, category: l.category })),
    month: dateKey(ym, 1).slice(0, 7),
  };
}
