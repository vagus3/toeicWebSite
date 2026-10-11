import { NextResponse } from "next/server";
import { apiError, limitRequest, requireSession } from "@/lib/api";
import {
  DRIVE_SCOPE,
  driveOAuthClient,
  isPersonalDriveConfigured,
} from "@/lib/google-drive/personal-drive";
import {
  createDriveState,
  DRIVE_STATE_COOKIE,
  DRIVE_STATE_TTL,
} from "@/lib/google-drive/oauth-state";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin)
    return apiError(403, "forbidden");
  const session = await requireSession();
  if (!session.ok) return session.response;
  const limited = limitRequest(
    request,
    "drive-connect",
    session.data.user.id,
    10,
    60000,
  );
  if (limited) return limited;
  if (!isPersonalDriveConfigured())
    return apiError(503, "drive_not_configured");
  const state = createDriveState(session.data.user.id);
  const url = driveOAuthClient(`${origin}/auth/drive/callback`).generateAuthUrl(
    {
      scope: ["openid", "email", DRIVE_SCOPE],
      access_type: "offline",
      prompt: "consent select_account",
      state: state.state,
    },
  );
  const response = NextResponse.json(
    { url },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(DRIVE_STATE_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/drive/callback",
    maxAge: DRIVE_STATE_TTL / 1000,
  });
  return response;
}
