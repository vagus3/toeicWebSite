import { describe, expect, it } from "vitest";
import { cn, dDay, weekTestLabel } from "./utils";

describe("cn", () => {
  it("글자 크기 토큰과 색상 클래스를 둘 다 유지한다", () => {
    expect(cn("text-micro", "text-neutral-500")).toBe("text-micro text-neutral-500");
  });
  it("같은 그룹의 크기 토큰은 뒤의 것이 이긴다", () => {
    expect(cn("text-label", "md:text-meta", "text-body")).toBe("md:text-meta text-body");
  });
});

describe("dates", () => {
  it("10/8 기준 10/25 정기시험은 D-17", () => {
    expect(dDay(new Date(2026, 9, 8), new Date(2026, 9, 25))).toBe(17);
  });
  it("10/8(목) 기준 주간 테스트일은 10/10(토)", () => {
    expect(weekTestLabel(new Date(2026, 9, 8))).toBe("10/10");
  });
});
