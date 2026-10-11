import { describe, expect, it } from "vitest";
import { buildReviewItems, reviewKey, type DailyRcAttempt } from "./review-model";
import type { QuizQuestion } from "@/types";

const quiz: QuizQuestion[] = [
  { text: "Q1 ______", opts: ["a", "b", "c", "d"], answer: 0, why: "w1" },
  { text: "Q2 ______", opts: ["a", "b", "c", "d"], answer: 1, why: "w2" },
];
const rc = (setId: string, studyDate: string, answers: number[]): DailyRcAttempt => ({
  setId,
  studyDate,
  answers,
  questions: [5, 6, 7].map((part, i) => ({
    part: part as 5 | 6 | 7, skill: `skill${part}`, passage: part === 5 ? "" : "passage", text: `T${part}`,
    opts: ["o1", "o2", "o3", "o4"], answer: i, why: `why${part}`,
  })),
});
const empty = { dailyRc: [], word: [], hackers: [], notes: [], quiz };

describe("오답노트 모으기", () => {
  it("일일 RC는 틀린 문항만 지문·보기·해설과 함께 모은다", () => {
    const items = buildReviewItems({ ...empty, dailyRc: [rc("set-1", "2026-10-12", [0, 3, 2])] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source: "daily_rc", number: 2, detail: "Part 6 · skill6", passage: "passage", question: "T6",
      myAnswer: 3, correctAnswer: 1, explanation: "why6", hasContent: true, reviewed: false,
    });
  });
  it("단어 퀴즈는 문항마다 가장 최근에 틀린 응시만 남긴다", () => {
    const items = buildReviewItems({
      ...empty,
      word: [
        { attemptId: "new", takenOn: "2026-10-12", answers: [0, 3] },
        { attemptId: "old", takenOn: "2026-10-11", answers: [2, 3] },
      ],
    });
    expect(items.map((i) => [i.sourceRef, i.number])).toEqual([["new", 2], ["old", 1]]);
    expect(items[1]).toMatchObject({ myAnswer: 2, correctAnswer: 0, explanation: "w1" });
  });
  it("해커스는 틀린 행만 모으고, 채운 문제와 복습 상태를 붙인다", () => {
    const hackers = [{
      reportId: "report-1", category: "lc" as const, testDate: "2026-10-10",
      rows: [
        { number: 3, selected: "A" as const, correctAnswer: "A" as const, result: "correct" as const },
        { number: 7, selected: "B" as const, correctAnswer: "D" as const, result: "incorrect" as const },
        { number: 9, selected: null, correctAnswer: "C" as const, result: "incorrect" as const },
      ],
    }];
    const items = buildReviewItems({
      ...empty,
      hackers,
      notes: [
        { source: "hackers_lc", source_ref: "report-1", item_number: 7, reviewed_at: "2026-10-12T00:00:00Z",
          content: { question: "What is the man doing?", options: ["a", "b", "c", "d"], explanation: "해설", explanationSource: "ai" } },
        { source: "hackers_lc", source_ref: "report-1", item_number: 9, reviewed_at: null, content: { question: 1 } },
      ],
    });
    expect(items.map((i) => i.number)).toEqual([7, 9]);
    expect(items[0]).toMatchObject({
      key: reviewKey("hackers_lc", "report-1", 7), source: "hackers_lc", myAnswer: 1, correctAnswer: 3,
      question: "What is the man doing?", explanationSource: "ai", hasContent: true, reviewed: true,
    });
    // 잘못 저장된 내용은 무시하고 채우기 전 상태로 보여준다
    expect(items[1]).toMatchObject({ myAnswer: null, correctAnswer: 2, hasContent: false, question: "" });
  });
  it("최신 날짜부터, 같은 날은 일일 RC → 해커스 → 단어 순서로 정렬한다", () => {
    const items = buildReviewItems({
      ...empty,
      dailyRc: [rc("set-old", "2026-10-11", [3, 3, 3]), rc("set-new", "2026-10-12", [1, 1, 2])],
      word: [{ attemptId: "w", takenOn: "2026-10-12", answers: [3, 1] }],
    });
    expect(items.map((i) => `${i.date}/${i.source}/${i.number}`)).toEqual([
      "2026-10-12/daily_rc/1", "2026-10-12/word/1",
      "2026-10-11/daily_rc/1", "2026-10-11/daily_rc/2", "2026-10-11/daily_rc/3",
    ]);
  });
});
