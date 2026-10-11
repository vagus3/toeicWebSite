import { describe, it, expect } from "vitest";
import { confirmedReportSchema, ocrReportSchema, summarizeOcr } from "./hackers-schema";
const ids = { submissionId: "11111111-1111-4111-8111-111111111111", partyId: "22222222-2222-4222-8222-222222222222" };
const row = { number: 1, selected: "A", correctAnswer: "B", result: "correct" };
const base = { ...ids, testDate: "2026-10-12", total: 1, correct: 0, method: "ocr-reviewed", rows: [row] };
describe("해커스 채점표 검증", () => {
  it("선택 답과 정답이 있으면 정오를 계산한다", () => {
    expect(confirmedReportSchema.parse(base).rows[0].result).toBe("incorrect");
  });
  it("점수와 전체 문항 수 및 문항별 결과의 모순을 거절한다", () => {
    expect(confirmedReportSchema.safeParse({ ...base, correct: 2 }).success).toBe(false);
    expect(confirmedReportSchema.safeParse({ ...base, correct: 1 }).success).toBe(false);
  });
  it("중복 문항과 유효하지 않은 날짜를 거절한다", () => {
    expect(confirmedReportSchema.safeParse({ ...base, total: 2, rows: [row, row] }).success).toBe(false);
    expect(confirmedReportSchema.safeParse({ ...base, testDate: "2026-02-30" }).success).toBe(false);
  });
  it("모르는 답을 추측하지 않고 합계만 있는 결과도 허용한다", () => {
    expect(confirmedReportSchema.parse({ ...base, rows: [] }).rows).toEqual([]);
    const report = ocrReportSchema.parse({ recognized: true, testDate: null, total: 7, correct: null, rows: [{ number: 1, selected: null, correctAnswer: null, result: "unknown" }] });
    expect(summarizeOcr(report).correct).toBeNull(); expect(summarizeOcr(report).total).toBe(7);
  });
  it("문항 전체의 정오가 보일 때에만 누락된 합계를 계산한다", () => {
    const report = ocrReportSchema.parse({ recognized: true, testDate: null, total: null, correct: null, rows: [row] });
    expect(summarizeOcr(report)).toMatchObject({ total: 1, correct: 0 });
  });
});
