import { z } from "zod";
import { STUDY_CATEGORIES, type StudyCategory } from "@/types";
import type { HackersCategory, ReportRow } from "@/features/quiz/hackers-schema";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const recordsQuerySchema = z.object({
  partyId: z.uuid(),
  month: z.string().regex(MONTH),
  memberId: z.uuid().optional(),
  category: z.enum(STUDY_CATEGORIES).optional(),
});
export type RecordsQuery = z.infer<typeof recordsQuerySchema>;

/** 증빙이 있는 학습 기록 한 건. 해커스 채점표면 채점 결과가 붙는다. */
export interface RecordItem {
  id: string;
  userId: string;
  category: StudyCategory;
  studyDate: string;
  createdAt: string;
  report: {
    id: string;
    category: HackersCategory;
    total: number;
    correct: number;
    testDate: string;
    rows: ReportRow[];
  } | null;
}

/** 한 달 기록은 200건 안쪽이라 페이지 없이 보여준다 */
export const RECORDS_LIMIT = 200;

/** "2026-10" → { from: "2026-10-01", to: "2026-11-01" } (to는 포함하지 않음) */
export function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  const next = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
  return { from: `${month}-01`, to: `${next}-01` };
}

export function shiftRecordsMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isRecordsMonth(value: string | null): value is string {
  return Boolean(value && MONTH.test(value));
}
