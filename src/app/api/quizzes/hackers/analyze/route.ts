import { NextResponse } from "next/server";
import { z } from "zod";
import { hackersCategorySchema, MAX_REPORT_PAGES } from "@/features/quiz/hackers-schema";
import { apiError, requireSession, limitRequest } from "@/lib/api";
import { isReportImage, MAX_REPORT_BYTES, MAX_REPORT_TOTAL_BYTES, readHackersReport } from "@/lib/ai/report-reader";
export const maxDuration = 60;
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const limited = limitRequest(request, "report-read", session.data.user.id, 20, 86400000);
  if (limited) return limited;
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError(400, "invalid_request"); }
  const partyId = z.uuid().safeParse(form.get("partyId"));
  const category = hackersCategorySchema.safeParse(form.get("category") ?? "rc");
  // 캡처 이미지는 한 장, 결과지 PDF는 쪽마다 한 장씩 온다
  const files = form.getAll("file");
  if (!partyId.success || !category.success || !files.length || files.length > MAX_REPORT_PAGES
    || !files.every((f): f is File => f instanceof File)) return apiError(400, "invalid_request");
  if (files.some((f) => !f.size || f.size > MAX_REPORT_BYTES)
    || files.reduce((sum, f) => sum + f.size, 0) > MAX_REPORT_TOTAL_BYTES) return apiError(415, "invalid_file");
  const { data, error } = await session.data.supabase.from("party_members").select("user_id")
    .eq("party_id", partyId.data).eq("user_id", session.data.user.id).maybeSingle();
  if (error || !data) return apiError(403, "forbidden");
  const images = await Promise.all(files.map(async (f) => ({ bytes: Buffer.from(await f.arrayBuffer()), mime: f.type })));
  if (!images.every((image) => isReportImage(image.bytes, image.mime))) return apiError(415, "invalid_file");
  if (!(process.env.GROQ_API_KEY || process.env.GROQ_KEY)) return apiError(503, "ai_not_configured");
  try {
    return NextResponse.json(await readHackersReport(images, category.data), { headers: { "Cache-Control": "private, no-store" } });
  } catch { return apiError(502, "report_read_failed"); }
}
