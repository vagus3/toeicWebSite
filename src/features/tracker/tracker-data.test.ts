import { describe, expect, it } from "vitest";
import { dayDetail, stepDay, type TrackerSource } from "./tracker-data";
import type { Member } from "@/types";

const member: Member = { id: "m1", name: "가", initial: "가", track: "800", quota: 0, book: { done: 0, total: 24 }, score: null, streak: 0, baseline: 0 };
const source: TrackerSource = {
  members: [member],
  studyDate: "2026-10-12",
  startDate: "2026-10-01",
  mode: "live",
  logs: [
    { id: "a", user_id: "m1", category: "word", study_date: "2026-10-12", amount: 1, study_evidences: [{ id: "e1" }] },
    { id: "b", user_id: "m1", category: "rc", study_date: "2026-10-12", amount: 3, study_evidences: [] },
    { id: "c", user_id: "m1", category: "lc", study_date: "2026-10-11", amount: 1, study_evidences: [{ id: "e2" }] },
  ],
};

describe("트래커 칸 상세", () => {
  it("그날 사진이 있는 기록만 증빙으로 보여 주고 기록 화면용 월을 준다", () => {
    const detail = dayDetail(0, { year: 2026, month: 9 }, 11, source);
    expect(detail.evidenceLogs).toEqual([{ id: "a", category: "word" }]);
    expect(detail.month).toBe("2026-10");
    expect(detail.rc).toBe("인증 완료");
  });
});

describe("하루씩 이동", () => {
  it("달의 첫날과 마지막 날(이번 달은 오늘)에서 멈춘다", () => {
    expect(stepDay(4, 1, 12)).toBe(5);
    expect(stepDay(0, -1, 31)).toBe(0);
    expect(stepDay(11, 1, 12)).toBe(11);
  });
});
