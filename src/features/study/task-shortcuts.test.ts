import { describe, expect, it } from "vitest";
import { shortcutsFor } from "./task-shortcuts";

describe("테스트로 인증 바로가기", () => {
  it("자동 인증되는 테스트로 보낸다", () => {
    expect(shortcutsFor("word", false).map((s) => s.href)).toEqual(["/quizzes/hackers/word"]);
    expect(shortcutsFor("lc", false).map((s) => s.href)).toEqual(["/quizzes/hackers/lc"]);
    expect(shortcutsFor("rc", false).map((s) => s.href)).toEqual(["/quizzes/hackers"]);
  });

  it("교재는 사진으로만 인증한다", () => {
    expect(shortcutsFor("book", false)).toEqual([]);
  });

  it("오늘 이미 인증한 항목은 숨긴다", () => {
    expect(shortcutsFor("rc", true)).toEqual([]);
  });
});
