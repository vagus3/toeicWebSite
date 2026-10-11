import { NextResponse } from "next/server";
import { createPartySchema } from "@/features/party/party-schema";
import { apiError, limitRequest, parseJson, requireSession } from "@/lib/api";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { supabase, user } = session.data;
  const limited = limitRequest(
    request,
    "party-create",
    user.id,
    10,
    60 * 60 * 1000,
  );
  if (limited) return limited;
  const body = await parseJson(request, createPartySchema);
  if (!body.ok) return body.response;
  const { data, error } = await supabase.rpc("create_study_party", {
    p_name: body.data.name,
    p_exam_date: body.data.examDate,
    p_capacity: body.data.capacity,
  });
  if (error) return apiError(400, "party_create_failed");
  const response = NextResponse.json({ partyId: data });
  response.cookies.set("study-party", data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
