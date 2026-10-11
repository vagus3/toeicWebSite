import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJson, requireSession } from "@/lib/api";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const body = await parseJson(request, z.object({ partyId: z.uuid() }));
  if (!body.ok) return body.response;
  const { data } = await session.data.supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", body.data.partyId)
    .eq("user_id", session.data.user.id)
    .maybeSingle();
  if (!data) return apiError(403, "forbidden");
  const response = NextResponse.json({ partyId: body.data.partyId });
  response.cookies.set("study-party", body.data.partyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
