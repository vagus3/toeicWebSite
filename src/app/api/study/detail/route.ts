import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireSession } from "@/lib/api";
import { loadStudyDetail } from "@/lib/study-server";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const partyId = z.uuid().safeParse(
    new URL(request.url).searchParams.get("partyId"),
  );
  if (!partyId.success) return apiError(400, "invalid_request");
  try {
    return NextResponse.json(
      await loadStudyDetail(
        session.data.supabase,
        session.data.user.id,
        partyId.data,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return apiError(500, "study_load_failed");
  }
}
