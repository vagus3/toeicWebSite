import { describe, it, expect } from "vitest";
import { rcSetSchema } from "./rc-schema";
import { rcFixture as questions } from "../../../tests/fixtures/rc";
describe("기존 RC 응시 기록 형식", () => {
  it("Part 5·6·7 각 한 문제를 검사한다", () => expect(rcSetSchema.safeParse({ questions }).success).toBe(true));
  it("파트 누락·순서 오류를 거절한다", () => expect(rcSetSchema.safeParse({ questions: [questions[0], questions[0], questions[2]] }).success).toBe(false));
  it("지문 누락·중복 보기·잘못된 정답을 거절한다", () => {
    for (const change of [{ passage: "" }, { opts: ["a", "a", "b", "c"] }, { answer: 4 }]) {
      expect(rcSetSchema.safeParse({ questions: [questions[0], { ...questions[1], ...change }, questions[2]] }).success).toBe(false);
    }
  });
  it("빈칸이 없거나 둘이면 거절한다", () => {
    for (const text of ["No blank", "Two ____ blanks ____"]) expect(rcSetSchema.safeParse({ questions: [{ ...questions[0], text }, ...questions.slice(1)] }).success).toBe(false);
  });
});
