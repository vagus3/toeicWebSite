import { describe, expect, it } from "vitest";
import { scoreDomain } from "./score-domain";

describe("점수 그래프 범위", () => {
  it("점수와 목표가 모두 들어가게 여유를 둔다", () => {
    expect(scoreDomain([{ label: "1주", value: 685 }, { label: "2주", value: 740 }], 800)).toEqual([640, 840]);
  });

  it("점수가 없으면 목표 주변을 보여 준다", () => {
    expect(scoreDomain([], 800)).toEqual([760, 840]);
  });

  it("0점 아래와 990점 위로는 넘지 않는다", () => {
    expect(scoreDomain([{ label: "1주", value: 20 }], 990)).toEqual([0, 990]);
  });
});
