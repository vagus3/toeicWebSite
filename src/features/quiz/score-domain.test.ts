import { describe, expect, it } from "vitest";
import { scoreDomain } from "./score-domain";

describe("점수 그래프 범위", () => {
  it("실제 점수 주변을 확대한다", () => {
    expect(scoreDomain([{ label: "1주", value: 655 }, { label: "2주", value: 725 }])).toEqual([630, 750]);
  });
  it("빈 기록은 전체 범위를 반환한다", () => {
    expect(scoreDomain([])).toEqual([0, 990]);
  });
  it("동일 점수도 최소 100점 범위를 유지한다", () => {
    expect(scoreDomain([{ label: "1주", value: 700 }])).toEqual([650, 750]);
  });
  it("0점 아래와 990점 위로는 넘지 않는다", () => {
    expect(scoreDomain([{ label: "1주", value: 0 }, { label: "2주", value: 990 }])).toEqual([0, 990]);
  });
});
