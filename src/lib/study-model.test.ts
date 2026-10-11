import { describe, expect, it } from "vitest";
import {
  completedCategories,
  consecutiveDays,
  koreaStudyDate,
  type StudyLog,
} from "./study-model";
import { buildMonth } from "@/features/tracker/tracker-data";
import type { Member } from "@/types";

const log = (
  user: string,
  date: string,
  category: StudyLog["category"] = "word",
): StudyLog => ({
  id: crypto.randomUUID(),
  user_id: user,
  study_date: date,
  category,
  amount: 1,
});
describe("한국 학습일과 실제 트래커", () => {
  it("한국 자정 전후를 서버 시간대와 관계없이 구분한다", () => {
    expect(koreaStudyDate(new Date("2026-10-10T14:59:59Z"))).toBe("2026-10-10");
    expect(koreaStudyDate(new Date("2026-10-10T15:00:00Z"))).toBe("2026-10-11");
  });
  it("동일 카테고리 중복 업로드와 다른 사람·날짜 기록을 완료 수에 포함하지 않는다", () => {
    const logs = [
      log("me", "2026-10-11"),
      log("me", "2026-10-11"),
      log("other", "2026-10-11", "rc"),
      log("me", "2026-10-10", "lc"),
    ];
    expect(completedCategories(logs, "me", "2026-10-11")).toEqual({
      word: true,
      lc: false,
      rc: false,
      book: false,
    });
    const member: Member = {
      id: "me",
      name: "나",
      initial: "나",
      track: "800",
      quota: 0,
      book: { done: 0, total: 24 },
      score: null,
      streak: 0,
      baseline: 0,
    };
    const month = buildMonth(
      { year: 2026, month: 9 },
      {
        members: [member],
        logs,
        studyDate: "2026-10-11",
        startDate: "2026-10-01",
        mode: "live",
      },
    );
    expect(month.rows[0].cells[10].level).toBe(1);
    expect(month.rows[0].cells[11].future).toBe(true);
    expect(month.canNext).toBe(false);
  });
  it("학습 연속일은 중복 기록과 날짜 누락을 구분한다", () => {
    const logs = [
      log("me", "2026-10-11"),
      log("me", "2026-10-11", "rc"),
      log("me", "2026-10-10"),
      log("me", "2026-10-08"),
    ];
    expect(consecutiveDays(logs, "me", "2026-10-11")).toBe(2);
    expect(consecutiveDays(logs, "other", "2026-10-11")).toBe(0);
  });
});
