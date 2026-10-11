import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_REPORT_PAGES, reportRowSchema } from "@/features/quiz/hackers-schema";
import { apiError, limitRequest, requireSession } from "@/lib/api";
import {
  extractHackersWrongItems,
  isReportImage,
  MAX_REPORT_BYTES,
  MAX_REPORT_TOTAL_BYTES,
} from "@/lib/ai/report-reader";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * 결과지 PDF(쪽별 이미지)를 다시 받아 내 해커스 채점표의 틀린 문제·해설을 오답노트에 채운다.
 * 이미지는 저장하지 않고, 추출한 내용만 본인 전용 review_notes에 저장한다.
 */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { supabase, user } = session.data;
  // 채점표 자동 읽기와 같은 하루 한도를 쓴다
  const limited = limitRequest(request, "report-read", user.id, 20, 86400000);
  if (limited) return limited;
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError(400, "invalid_request"); }
  const reportId = z.uuid().safeParse(form.get("reportId"));
  const files = form.getAll("file");
  if (!reportId.success || !files.length || files.length > MAX_REPORT_PAGES
    || !files.every((f): f is File => f instanceof File)) return apiError(400, "invalid_request");
  if (files.some((f) => !f.size || f.size > MAX_REPORT_BYTES)
    || files.reduce((sum, f) => sum + f.size, 0) > MAX_REPORT_TOTAL_BYTES) return apiError(415, "invalid_file");
  const { data: report, error } = await supabase
    .from("hackers_rc_reports")
    .select("id, party_id, category, rows")
    .eq("id", reportId.data)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return apiError(500, "load_failed");
  if (!report) return apiError(404, "not_found");
  const rows = z.array(reportRowSchema).safeParse(report.rows);
  const wrong = rows.success ? rows.data.filter((r) => r.result === "incorrect") : [];
  if (!wrong.length) return apiError(400, "no_wrong_items");
  const images = await Promise.all(files.map(async (f) => ({ bytes: Buffer.from(await f.arrayBuffer()), mime: f.type })));
  if (!images.every((image) => isReportImage(image.bytes, image.mime))) return apiError(415, "invalid_file");
  if (!(process.env.GROQ_API_KEY || process.env.GROQ_KEY)) return apiError(503, "ai_not_configured");
  const admin = getSupabaseAdminClient();
  if (!admin) return apiError(503, "not_configured");
  const category = report.category === "lc" ? "lc" : "rc";
  let extracted: Awaited<ReturnType<typeof extractHackersWrongItems>>;
  try {
    extracted = await extractHackersWrongItems(images, category, wrong);
  } catch {
    return apiError(502, "report_read_failed");
  }
  if (extracted.length) {
    const now = new Date().toISOString();
    // 복습 상태(reviewed_at)는 건드리지 않고 내용만 채운다
    const { error: saveError } = await admin.from("review_notes").upsert(
      extracted.map(({ number, content }) => ({
        user_id: user.id,
        party_id: report.party_id,
        source: `hackers_${category}`,
        source_ref: report.id,
        item_number: number,
        content,
        updated_at: now,
      })),
      { onConflict: "user_id,source,source_ref,item_number" },
    );
    if (saveError) return apiError(500, "save_failed");
  }
  const filled = extracted.map((e) => e.number);
  return NextResponse.json(
    { filled, missing: wrong.map((r) => r.number).filter((n) => !filled.includes(n)) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
