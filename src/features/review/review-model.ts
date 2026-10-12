import { z } from "zod";
import type { RcQuestion } from "@/features/quiz/rc-schema";
import type { HackersCategory, ReportRow } from "@/features/quiz/hackers-schema";
import type { QUESTION_TAGS } from "@/features/qna/ask-schema";
import type { QuizQuestion } from "@/types";

export const REVIEW_SOURCES = ["daily_rc", "word", "hackers_rc", "hackers_lc", "hackers_word"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export const SOURCE_LABEL: Record<ReviewSource, string> = {
  daily_rc: "일일 RC",
  hackers_rc: "해커스 RC",
  hackers_lc: "해커스 LC",
  hackers_word: "해커스 단어",
  word: "단어",
};

type QuestionTag = (typeof QUESTION_TAGS)[number];

/**
 * 오답을 질문 창구에 올릴 때 미리 고를 영역. 일일 RC는 "Part n" 표시에서,
 * 해커스는 실제 문항 번호에서 파트를 읽는다 (RC 101–130 Part 5 · 131–146 Part 6 · 147– Part 7,
 * LC 1–6 Part 1 · 7–31 Part 2 · 32–70 Part 3 · 71– Part 4). 질문하기 창에서 바꿀 수 있다.
 */
export function questionTag(item: Pick<ReviewItem, "source" | "detail" | "number">): QuestionTag {
  if (item.source === "word" || item.source === "hackers_word") return "단어";
  if (item.source === "daily_rc") {
    const part = /Part ([567])/.exec(item.detail)?.[1];
    return part ? (`RC Part ${part}` as QuestionTag) : "RC Part 5";
  }
  const n = item.number;
  if (item.source === "hackers_rc")
    return n >= 147 ? "RC Part 7" : n >= 131 ? "RC Part 6" : "RC Part 5";
  return n <= 6 ? "LC Part 1" : n <= 31 ? "LC Part 2" : n <= 70 ? "LC Part 3" : "LC Part 4";
}

/**
 * 복습 전 오답이 가장 많은 출처 — 테스트 화면의 "약한 영역" 통계.
 * 같은 수면 먼저 나온 출처를 고른다. 복습할 오답이 없으면 null.
 */
export function weakestSource(items: { source: ReviewSource; reviewed: boolean }[]) {
  const counts = new Map<ReviewSource, number>();
  for (const item of items)
    if (!item.reviewed) counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
  let weakest: { source: ReviewSource; count: number } | null = null;
  for (const [source, count] of counts)
    if (!weakest || count > weakest.count) weakest = { source, count };
  return weakest;
}

/** 해커스 결과지에서 AI가 뽑은 틀린 문제 하나 */
export const reviewContentSchema = z.object({
  passage: z.string().trim().max(6000).default(""),
  question: z.string().trim().max(1000).default(""),
  options: z.array(z.string().trim().max(500)).max(4).default([]),
  script: z.string().trim().max(4000).default(""),
  explanation: z.string().trim().max(3000).default(""),
  /** printed: 결과지에 인쇄된 해설, ai: 해설이 없어 AI가 쓴 해설 */
  explanationSource: z.enum(["printed", "ai"]).default("printed"),
});
export type ReviewContent = z.infer<typeof reviewContentSchema>;

export function hasReviewContent(content: ReviewContent) {
  return Boolean(content.question || content.options.length || content.script);
}

export const reviewStatusSchema = z.object({
  partyId: z.uuid(),
  source: z.enum(REVIEW_SOURCES),
  sourceRef: z.uuid(),
  number: z.number().int().min(1).max(200),
  reviewed: z.boolean(),
});
export type ReviewStatusInput = z.infer<typeof reviewStatusSchema>;

export interface ReviewItem {
  key: string;
  source: ReviewSource;
  sourceRef: string;
  /** 일일 RC·단어는 문항 순서(1부터), 해커스는 실제 문항 번호 */
  number: number;
  date: string;
  detail: string;
  passage: string;
  question: string;
  options: string[];
  script: string;
  /** 보기 순서(0=A). 고르지 않았거나 알 수 없으면 null */
  myAnswer: number | null;
  correctAnswer: number | null;
  /** 단어 주관식 답. 객관식의 보기 번호와 분리해 그대로 표시한다. */
  myAnswerText?: string | null;
  correctAnswerText?: string | null;
  explanation: string;
  /** generated: 일일 RC·단어 문제와 함께 만든 해설 */
  explanationSource: "printed" | "ai" | "generated";
  /** 해커스 문항은 결과지에서 문제를 채우기 전까지 false */
  hasContent: boolean;
  reviewed: boolean;
}

export type DailyRcAttempt = { setId: string; studyDate: string; questions: RcQuestion[]; answers: number[] };
/** 최신 응시가 앞에 온다 */
export type WordAttempt = { attemptId: string; takenOn: string; answers: number[] };
export type HackersReportInput = { reportId: string; category: HackersCategory; testDate: string; rows: ReportRow[] };
export type ReviewNoteRow = {
  source: ReviewSource;
  source_ref: string;
  item_number: number;
  content: unknown;
  reviewed_at: string | null;
};

const SOURCE_ORDER: Record<ReviewSource, number> = { daily_rc: 0, hackers_rc: 1, hackers_lc: 2, hackers_word: 3, word: 4 };
const LETTER_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
const answerIndex = (answer: string | null) => answer !== null && Object.hasOwn(LETTER_INDEX, answer) ? LETTER_INDEX[answer] : null;

export function reviewKey(source: ReviewSource, sourceRef: string, number: number) {
  return `${source}:${sourceRef}:${number}`;
}

/** 세 출처의 오답을 같은 형태로 모은다. 날짜 최신순, 같은 날은 출처·문항 순서. */
export function buildReviewItems(input: {
  dailyRc: DailyRcAttempt[];
  word: WordAttempt[];
  hackers: HackersReportInput[];
  notes: ReviewNoteRow[];
  quiz: QuizQuestion[];
}): ReviewItem[] {
  const notes = new Map(input.notes.map((n) => [reviewKey(n.source, n.source_ref, n.item_number), n]));
  const reviewed = (key: string) => Boolean(notes.get(key)?.reviewed_at);
  const items: ReviewItem[] = [];

  for (const attempt of input.dailyRc)
    attempt.questions.forEach((q, i) => {
      const mine = attempt.answers[i] ?? null;
      if (mine === q.answer) return;
      const key = reviewKey("daily_rc", attempt.setId, i + 1);
      items.push({
        key, source: "daily_rc", sourceRef: attempt.setId, number: i + 1, date: attempt.studyDate,
        detail: `Part ${q.part} · ${q.skill}`, passage: q.passage, question: q.text, options: q.opts, script: "",
        myAnswer: mine, correctAnswer: q.answer, explanation: q.why, explanationSource: "generated",
        hasContent: true, reviewed: reviewed(key),
      });
    });

  // 단어 퀴즈는 매일 같은 문제라 문항마다 가장 최근에 틀린 응시만 남긴다
  input.quiz.forEach((q, i) => {
    const attempt = input.word.find((a) => a.answers[i] !== q.answer);
    if (!attempt) return;
    const key = reviewKey("word", attempt.attemptId, i + 1);
    items.push({
      key, source: "word", sourceRef: attempt.attemptId, number: i + 1, date: attempt.takenOn,
      detail: "단어 · 빈칸 채우기", passage: "", question: q.text, options: q.opts, script: "",
      myAnswer: attempt.answers[i] ?? null, correctAnswer: q.answer, explanation: q.why,
      explanationSource: "generated", hasContent: true, reviewed: reviewed(key),
    });
  });

  for (const report of input.hackers) {
    const source: ReviewSource = `hackers_${report.category}`;
    for (const row of report.rows) {
      if (row.result !== "incorrect") continue;
      const key = reviewKey(source, report.reportId, row.number);
      const parsed = reviewContentSchema.safeParse(notes.get(key)?.content ?? null);
      const content = parsed.success ? parsed.data : null;
      items.push({
        key, source, sourceRef: report.reportId, number: row.number, date: report.testDate,
        detail: `${row.number}번`, passage: content?.passage ?? "", question: content?.question ?? "",
        options: content?.options ?? [], script: content?.script ?? "",
        myAnswer: answerIndex(row.selected),
        correctAnswer: answerIndex(row.correctAnswer),
        ...(report.category === "word" ? { myAnswerText: row.selected, correctAnswerText: row.correctAnswer } : {}),
        explanation: content?.explanation ?? "", explanationSource: content?.explanationSource ?? "printed",
        hasContent: Boolean(content && hasReviewContent(content)), reviewed: reviewed(key),
      });
    }
  }

  return items.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source] ||
      a.sourceRef.localeCompare(b.sourceRef) ||
      a.number - b.number,
  );
}
