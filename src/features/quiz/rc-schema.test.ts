import { describe, it, expect } from "vitest";
import { rcSetSchema, publicRcQuestions, rcRequestSchema } from "./rc-schema";
import { rcFixture as questions } from "../../../tests/fixtures/rc";
describe("일일 RC 문제 형식", () => {
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
  it("제출 전에 정답과 해설을 공개하지 않는다", () => {
    for (const q of publicRcQuestions(rcSetSchema.parse({ questions }).questions)) { expect(q).not.toHaveProperty("answer"); expect(q).not.toHaveProperty("why"); }
  });
  it("불완전한 제출을 거절한다", () => {
    expect(rcRequestSchema.safeParse({ action: "submit", partyId: crypto.randomUUID(), setId: crypto.randomUUID(), answers: [0, 1] }).success).toBe(false);
  });
});
