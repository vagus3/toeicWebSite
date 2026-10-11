import { NextResponse } from "next/server";
import { z } from "zod";
import { hackersCategorySchema } from "@/features/quiz/hackers-schema";
import { apiError, requireSession, limitRequest } from "@/lib/api";
import { isReportImage, MAX_REPORT_BYTES, readHackersReport } from "@/lib/ai/report-reader";
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
  const file = form.get("file");
  if (!partyId.success || !category.success || !(file instanceof File)) return apiError(400, "invalid_request");
  if (!file.size || file.size > MAX_REPORT_BYTES) return apiError(415, "invalid_file");
  const { data, error } = await session.data.supabase.from("party_members").select("user_id")
    .eq("party_id", partyId.data).eq("user_id", session.data.user.id).maybeSingle();
  if (error || !data) return apiError(403, "forbidden");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isReportImage(bytes, file.type)) return apiError(415, "invalid_file");
  if (!(process.env.GROQ_API_KEY || process.env.GROQ_KEY)) return apiError(503, "ai_not_configured");
  try {
    return NextResponse.json(await readHackersReport(bytes, file.type, category.data), { headers: { "Cache-Control": "private, no-store" } });
  } catch { return apiError(502, "report_read_failed"); }
}
