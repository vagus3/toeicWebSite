import { describe, expect, it } from "vitest";
import { dDayLabel } from "./use-party";

describe("dDayLabel", () => {
  it("시험일이 없으면 미정 (D-— 로 보이지 않게)", () => expect(dDayLabel(null)).toBe("미정"));
  it("남은 날은 D-n", () => expect(dDayLabel(17)).toBe("D-17"));
  it("당일은 D-Day", () => expect(dDayLabel(0)).toBe("D-Day"));
  it("지난 날은 D+n (D--3 으로 보이지 않게)", () => expect(dDayLabel(-3)).toBe("D+3"));
});
