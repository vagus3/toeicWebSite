import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { connectPersonalDrive } from "@/lib/google-drive/personal-drive";
import { driveConnectionFailure } from "@/lib/google-drive/connection-error";
import {
  DRIVE_STATE_COOKIE,
  validDriveState,
} from "@/lib/google-drive/oauth-state";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const finish = (status: string) => {
    // 연결 결과 안내(NOTICES)는 Drive 설정이 있는 내 메뉴에서 보여 준다
    const url = new URL("/me", origin);
    url.searchParams.set("drive", status);
    const response = NextResponse.redirect(url);
    response.cookies.set(DRIVE_STATE_COOKIE, "", {
      path: "/auth/drive/callback",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return response;
  };
  const supabase = await getSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (
    !user ||
    !validDriveState(
      request.cookies.get(DRIVE_STATE_COOKIE)?.value,
      searchParams.get("state"),
      user.id,
    )
  )
    return finish("invalid_state");
  if (searchParams.get("error")) return finish("cancelled");
  const code = searchParams.get("code");
  if (!code) return finish("failed");
  try {
    await connectPersonalDrive(user.id, code, `${origin}/auth/drive/callback`);
    return finish("connected");
  } catch (error) {
    const reason = driveConnectionFailure(error);
    console.error("drive_connection_failed", { reason });
    return finish(reason);
  }
}
