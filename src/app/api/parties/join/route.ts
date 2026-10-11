import { NextResponse } from "next/server";
import { z } from "zod";
import { inviteCodeSchema } from "@/features/party/party-schema";
import { apiError, limitRequest, parseJson, requireSession } from "@/lib/api";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { supabase, user } = session.data;
  const limited = limitRequest(request, "party-join", user.id, 20, 60 * 1000);
  if (limited) return limited;
  const body = await parseJson(request, z.object({ code: inviteCodeSchema }));
  if (!body.ok) return body.response;
  const { data, error } = await supabase.rpc("join_study_party", {
    p_code: body.data.code,
  });
  if (error)
    return apiError(
      error.message.includes("party_full") ? 409 : 400,
      error.message.includes("party_full") ? "party_full" : "invalid_invite",
    );
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
