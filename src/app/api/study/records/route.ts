import { NextResponse } from "next/server";
import { apiError, requireSession } from "@/lib/api";
import type { HackersCategory, ReportRow } from "@/features/quiz/hackers-schema";
import {
  monthRange,
  RECORDS_LIMIT,
  recordsQuerySchema,
  type RecordItem,
} from "@/features/records/records-schema";
import type { StudyCategory } from "@/types";

type RecordRow = {
  id: string;
  user_id: string;
  category: StudyCategory;
  study_date: string;
  created_at: string;
  hackers_rc_reports:
    | {
        id: string;
        category: HackersCategory;
        total: number;
        correct: number;
        test_date: string;
        rows: ReportRow[];
      }[]
    | null;
};

/** 한 달 동안 파티원이 올린 인증 사진·채점표 목록. RLS가 같은 파티 기록만 돌려준다. */
export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const params = new URL(request.url).searchParams;
  const parsed = recordsQuerySchema.safeParse({
    partyId: params.get("partyId"),
    month: params.get("month"),
    memberId: params.get("memberId") || undefined,
    category: params.get("category") || undefined,
  });
  if (!parsed.success) return apiError(400, "invalid_request");
  const { partyId, month, memberId, category } = parsed.data;
  const { from, to } = monthRange(month);
  let query = session.data.supabase
    .from("study_logs")
    // 증빙이 있는 기록만 inner join으로 고른다
    .select(
      "id, user_id, category, study_date, created_at, study_evidences!inner(id), hackers_rc_reports(id, category, total, correct, test_date, rows)",
    )
    .eq("party_id", partyId)
    .gte("study_date", from)
    .lt("study_date", to);
  if (memberId) query = query.eq("user_id", memberId);
  if (category) query = query.eq("category", category);
  const { data, error } = await query
    .order("study_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(RECORDS_LIMIT);
  if (error) return apiError(500, "load_failed");
  const records: RecordItem[] = ((data ?? []) as unknown as RecordRow[]).map((row) => {
    const report = row.hackers_rc_reports?.[0];
    return {
      id: row.id,
      userId: row.user_id,
      category: row.category,
      studyDate: row.study_date,
      createdAt: row.created_at,
      report: report
        ? {
            id: report.id,
            category: report.category,
            total: report.total,
            correct: report.correct,
            testDate: report.test_date,
            rows: report.rows,
          }
        : null,
    };
  });
  return NextResponse.json(
    { records },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
