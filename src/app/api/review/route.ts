import { NextResponse } from "next/server";
import { z } from "zod";
import { reportRowSchema } from "@/features/quiz/hackers-schema";
import { rcSetSchema } from "@/features/quiz/rc-schema";
import {
  buildReviewItems,
  reviewStatusSchema,
  type DailyRcAttempt,
  type HackersReportInput,
  type ReviewNoteRow,
  type WordAttempt,
} from "@/features/review/review-model";
import { apiError, limitRequest, parseJson, requireSession } from "@/lib/api";
import { QUIZ } from "@/lib/demo-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };
/** 1년 보관 기간 안의 기록이라 이 정도면 충분하다 */
const MAX_SOURCES = 400;
const rcAnswers = z.array(z.number().int().min(0).max(3)).length(3);
const wordAnswers = z.array(z.number().int().min(0).max(3)).length(QUIZ.length);
const reportRows = z.array(reportRowSchema);

type RcAttemptRow = {
  set_id: string;
  answers: unknown;
  daily_rc_sets: { study_date: string; questions: unknown } | null;
};

/** 내 오답노트. 원본 기록에서 매번 오답을 계산하고, 복습 상태·해커스 추출 내용을 붙인다. */
export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const partyId = z.uuid().safeParse(new URL(request.url).searchParams.get("partyId"));
  if (!partyId.success) return apiError(400, "invalid_request");
  const { supabase, user } = session.data;
  const { data: member, error: memberError } = await supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", partyId.data)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError || !member) return apiError(403, "forbidden");
  const admin = getSupabaseAdminClient();
  if (!admin) return apiError(503, "not_configured");
  const [rc, word, hackers, notes] = await Promise.all([
    // 일일 RC 문제·결과는 서버만 읽는다. 본인 응시로만 한정한다.
    admin
      .from("daily_rc_attempts")
      .select("set_id, answers, daily_rc_sets!inner(party_id, study_date, questions)")
      .eq("user_id", user.id)
      .eq("daily_rc_sets.party_id", partyId.data)
      .lt("score", 3)
      .order("created_at", { ascending: false })
      .limit(MAX_SOURCES),
    supabase
      .from("quiz_attempts")
      .select("id, taken_on, answers")
      .eq("party_id", partyId.data)
      .eq("user_id", user.id)
      .eq("kind", "daily")
      .lt("score", QUIZ.length)
      .order("created_at", { ascending: false })
      .limit(MAX_SOURCES),
    supabase
      .from("hackers_rc_reports")
      .select("id, category, test_date, rows")
      .eq("party_id", partyId.data)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_SOURCES),
    supabase
      .from("review_notes")
      .select("source, source_ref, item_number, content, reviewed_at")
      .eq("party_id", partyId.data)
      .eq("user_id", user.id),
  ]);
  if (rc.error || word.error || hackers.error || notes.error)
    return apiError(500, "load_failed");
  // 형식이 맞지 않는 옛 기록은 건너뛰고 나머지는 보여준다
  const dailyRc: DailyRcAttempt[] = ((rc.data ?? []) as unknown as RcAttemptRow[]).flatMap((row) => {
    const set = rcSetSchema.safeParse({ questions: row.daily_rc_sets?.questions });
    const answers = rcAnswers.safeParse(row.answers);
    return set.success && answers.success && row.daily_rc_sets
      ? [{ setId: row.set_id, studyDate: row.daily_rc_sets.study_date, questions: set.data.questions, answers: answers.data }]
      : [];
  });
  const wordAttempts: WordAttempt[] = (word.data ?? []).flatMap((row) => {
    const answers = wordAnswers.safeParse(row.answers);
    return answers.success ? [{ attemptId: row.id, takenOn: row.taken_on, answers: answers.data }] : [];
  });
  const reports: HackersReportInput[] = (hackers.data ?? []).flatMap((row) => {
    const rows = reportRows.safeParse(row.rows);
    return rows.success
      ? [{ reportId: row.id, category: row.category === "lc" ? "lc" as const : "rc" as const, testDate: row.test_date, rows: rows.data }]
      : [];
  });
  const items = buildReviewItems({
    dailyRc,
    word: wordAttempts,
    hackers: reports,
    notes: (notes.data ?? []) as ReviewNoteRow[],
    quiz: QUIZ,
  });
  return NextResponse.json({ items }, { headers: NO_STORE });
}

/** 복습 완료 표시. RLS가 본인·소속 파티만 허용한다. */
export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return apiError(403, "forbidden");
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { supabase, user } = session.data;
  const limited = limitRequest(request, "review-status", user.id, 300, 3600000);
  if (limited) return limited;
  const body = await parseJson(request, reviewStatusSchema);
  if (!body.ok) return body.response;
  const input = body.data;
  const now = new Date().toISOString();
  const { error } = await supabase.from("review_notes").upsert(
    {
      user_id: user.id,
      party_id: input.partyId,
      source: input.source,
      source_ref: input.sourceRef,
      item_number: input.number,
      reviewed_at: input.reviewed ? now : null,
      updated_at: now,
    },
    { onConflict: "user_id,source,source_ref,item_number" },
  );
  if (error) return apiError(error.code === "42501" ? 403 : 500, "save_failed");
  return NextResponse.json({ saved: true }, { headers: NO_STORE });
}
