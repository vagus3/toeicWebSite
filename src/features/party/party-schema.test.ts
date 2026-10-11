import { describe, expect, it } from "vitest";
import {
  createPartySchema,
  partyErrorMessage,
  safeNextPath,
} from "./party-schema";
import { gradeQuiz, studyActionSchema } from "@/features/study/study-schema";
import { QUIZ } from "@/lib/demo-data";

describe("참가·기록 입력 검증", () => {
  it("로그인 후 외부 주소와 역슬래시 우회로 이동하지 않는다", () => {
    for (const value of [
      null,
      "https://example.com",
      "//example.com",
      "/\\example.com",
      "/\nexample.com",
    ])
      expect(safeNextPath(value)).toBe("/dashboard");
    expect(safeNextPath("/tracker?month=10")).toBe("/tracker?month=10");
  });
  it("잘못된 날짜·정원·빈 파티 이름을 거절한다", () => {
    expect(
      createPartySchema.safeParse({ name: " ", examDate: null, capacity: 6 })
        .success,
    ).toBe(false);
    expect(
      createPartySchema.safeParse({
        name: "파티",
        examDate: "2026-02-30",
        capacity: 6,
      }).success,
    ).toBe(false);
    expect(
      createPartySchema.safeParse({
        name: "파티",
        examDate: null,
        capacity: 21,
      }).success,
    ).toBe(false);
  });
  it("클라이언트 점수가 아닌 선택한 답으로 퀴즈를 채점한다", () => {
    expect(gradeQuiz(QUIZ.map((q) => q.answer))).toBe(QUIZ.length);
    expect(
      studyActionSchema.safeParse({
        action: "quiz",
        partyId: "11111111-1111-4111-8111-111111111111",
        answers: [0],
        score: 999,
      }).success,
    ).toBe(false);
  });
  it("초대 오류에 맞는 참가 실패 메시지를 반환한다", () => {
    expect(partyErrorMessage("party_full")).toContain("정원");
    expect(partyErrorMessage("invalid_invite")).toContain("유효하지 않은");
  });
});
