import { z } from "zod";

export const HACKERS_RC_URL = "https://www.hackers.co.kr/?c=s_toeic/toeic_study/drc";
export const HACKERS_LC_URL = "https://www.hackers.co.kr/?c=s_toeic/toeic_study/dlc";
export const HACKERS_WORD_URL = "https://www.hackers.co.kr/?c=s_toeic/toeic_study/new_voca_toeic_testpaper";
export const hackersCategorySchema = z.enum(["rc", "lc", "word"]);
export type HackersCategory = z.infer<typeof hackersCategorySchema>;
export const HACKERS_URLS = { rc: HACKERS_RC_URL, lc: HACKERS_LC_URL, word: HACKERS_WORD_URL };
export const HACKERS_LABELS = { rc: "RC", lc: "LC", word: "단어" };
const choice = z.string().trim().min(1).max(200).nullable();
/** 주관식은 문자열 비교로 채점하지 않고 원본 결과표의 정오를 유지한다. */
export function hasChoiceAnswers(row: { selected: string | null; correctAnswer: string | null }) {
  return Boolean(row.selected && row.correctAnswer && /^[A-D]$/.test(row.selected) && /^[A-D]$/.test(row.correctAnswer));
}
export const reportRowSchema = z.object({
  number: z.number().int().min(1).max(200),
  selected: choice,
  correctAnswer: choice,
  result: z.enum(["correct", "incorrect", "unknown"]),
}).transform((r) => ({ ...r, result: hasChoiceAnswers(r)
  ? r.selected === r.correctAnswer ? "correct" as const : "incorrect" as const : r.result }));
const rows = z.array(reportRowSchema).max(200).refine((rs) => new Set(rs.map((r) => r.number)).size === rs.length, "문항 번호가 중복됐어요");
/** 한 번에 읽는 쪽 수. 해커스 결과지 PDF(5쪽)를 한 번의 요청으로 보낸다. */
export const MAX_REPORT_PAGES = 5;
export const ocrReportSchema = z.object({
  recognized: z.boolean(),
  testDate: z.iso.date().nullable(),
  total: z.number().int().min(1).max(200).nullable(),
  correct: z.number().int().min(0).max(200).nullable(),
  rows,
  /** 채점 결과가 보이는 쪽 번호(1부터). 이 쪽만 증빙으로 저장한다. */
  pages: z.array(z.number().int().min(1).max(MAX_REPORT_PAGES)).max(MAX_REPORT_PAGES).default([]),
});
export const confirmedReportSchema = z.object({
  category: hackersCategorySchema.default("rc"),
  submissionId: z.uuid(), partyId: z.uuid(), testDate: z.iso.date(),
  total: z.number().int().min(1).max(200), correct: z.number().int().min(0).max(200),
  rows, method: z.enum(["ocr-reviewed", "manual"]),
}).superRefine((r, ctx) => {
  if (r.category !== "word" && r.rows.some((row) => [row.selected, row.correctAnswer].some((answer) => answer !== null && !/^[A-D]$/.test(answer))))
    ctx.addIssue({ code: "custom", message: "LC·RC 답은 A–D 보기로 입력해 주세요" });
  if (r.correct > r.total || r.rows.length > r.total) ctx.addIssue({ code: "custom", message: "정답 수와 문항 수를 확인해 주세요" });
  if (r.rows.length === r.total && r.rows.every((row) => row.result !== "unknown") && r.correct !== r.rows.filter((row) => row.result === "correct").length)
    ctx.addIssue({ code: "custom", message: "문항별 결과와 정답 수가 일치하지 않아요" });
});
export type ReportRow = z.infer<typeof reportRowSchema>;
export type OcrReport = z.infer<typeof ocrReportSchema>;
export type HackersReport = {
  category: HackersCategory;
  id: string; user_id: string; test_date: string; total: number; correct: number;
  rows: ReportRow[]; method: "ocr-reviewed" | "manual"; study_log_id: string;
  created_at: string; profiles: { nickname: string } | null;
};
export function summarizeOcr(report: OcrReport) {
  const complete = report.rows.length > 0 && report.rows.every((r) => r.result !== "unknown")
    && (report.total === null || report.rows.length === report.total);
  return { ...report, total: report.total ?? (complete ? report.rows.length : null),
    correct: report.correct ?? (complete ? report.rows.filter((r) => r.result === "correct").length : null) };
}
