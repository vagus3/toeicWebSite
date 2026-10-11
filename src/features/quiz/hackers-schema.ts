import { z } from "zod";

export const HACKERS_RC_URL = "https://www.hackers.co.kr/?c=s_toeic/toeic_study/drc";
const choice = z.enum(["A", "B", "C", "D"]).nullable();
export const reportRowSchema = z.object({
  number: z.number().int().min(1).max(200),
  selected: choice,
  correctAnswer: choice,
  result: z.enum(["correct", "incorrect", "unknown"]),
}).transform((r) => ({ ...r, result: r.selected && r.correctAnswer
  ? r.selected === r.correctAnswer ? "correct" as const : "incorrect" as const : r.result }));
const rows = z.array(reportRowSchema).max(200).refine((rs) => new Set(rs.map((r) => r.number)).size === rs.length, "문항 번호가 중복됐어요");
export const ocrReportSchema = z.object({
  recognized: z.boolean(),
  testDate: z.iso.date().nullable(),
  total: z.number().int().min(1).max(200).nullable(),
  correct: z.number().int().min(0).max(200).nullable(),
  rows,
});
export const confirmedReportSchema = z.object({
  submissionId: z.uuid(), partyId: z.uuid(), testDate: z.iso.date(),
  total: z.number().int().min(1).max(200), correct: z.number().int().min(0).max(200),
  rows, method: z.enum(["ocr-reviewed", "manual"]),
}).superRefine((r, ctx) => {
  if (r.correct > r.total || r.rows.length > r.total) ctx.addIssue({ code: "custom", message: "정답 수와 문항 수를 확인해 주세요" });
  if (r.rows.length === r.total && r.rows.every((row) => row.result !== "unknown") && r.correct !== r.rows.filter((row) => row.result === "correct").length)
    ctx.addIssue({ code: "custom", message: "문항별 결과와 정답 수가 일치하지 않아요" });
});
export type ReportRow = z.infer<typeof reportRowSchema>;
export type OcrReport = z.infer<typeof ocrReportSchema>;
export type HackersReport = {
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
