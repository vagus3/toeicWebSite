import { describe, expect, it } from "vitest";
import { categoryRate, dailyRate, doneRate } from "./progress";

describe("categoryRate", () => {
  it("목표를 넘겨도 100%가 상한", () => {
    expect(categoryRate({ actual: 80, target: 50 })).toBe(100);
  });
  it("목표가 0이면 0%", () => {
    expect(categoryRate({ actual: 10, target: 0 })).toBe(0);
  });
});

describe("dailyRate", () => {
  it("설계안 예시: 단어 40/50, LC 20/30, RC 25/30 → 약 76%", () => {
    const rate = dailyRate([
      { category: "word", actual: 40, target: 50 },
      { category: "lc", actual: 20, target: 30 },
      { category: "rc", actual: 25, target: 30 },
    ]);
    expect(Math.round(rate)).toBe(77);
  });
  it("한 영역 초과 달성이 다른 영역 미달을 상쇄하지 않는다", () => {
    const rate = dailyRate([
      { category: "word", actual: 200, target: 50 },
      { category: "lc", actual: 0, target: 30 },
    ]);
    expect(rate).toBe(50);
  });
  it("비활성 목표(target 0)는 제외", () => {
    expect(
      dailyRate([
        { category: "word", actual: 25, target: 50 },
        { category: "rc", actual: 0, target: 0 },
      ]),
    ).toBe(50);
  });
});

describe("doneRate", () => {
  it("4개 중 2개 인증 → 50%", () => {
    expect(doneRate({ word: true, lc: true, rc: false, book: false })).toBe(50);
  });
});
