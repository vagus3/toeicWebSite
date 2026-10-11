import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { inviteCodeSchema, safeNextPath } from "@/features/party/party-schema";

/** Google OAuth / 이메일 링크 복귀 — code를 세션으로 교환하고 원래 가려던 곳으로 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const safeNext = safeNextPath(searchParams.get("next"));
  const invite = searchParams.get("invite");

  const supabase = await getSupabaseServerClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (invite) {
        const parsed = inviteCodeSchema.safeParse(invite);
        const result = parsed.success
          ? await supabase.rpc("join_study_party", { p_code: parsed.data })
          : { data: null, error: { message: "invalid_invite" } };
        if (result.error) {
          const login = new URL("/login", origin);
          login.searchParams.set("invite", invite);
          login.searchParams.set(
            "error",
            result.error.message.includes("party_full")
              ? "party_full"
              : "invalid_invite",
          );
          return NextResponse.redirect(login);
        }
        const response = NextResponse.redirect(new URL("/dashboard", origin));
        response.cookies.set("study-party", result.data, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        });
        return response;
      }
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }
  const login = new URL("/login?error=auth", origin);
  if (invite) login.searchParams.set("invite", invite);
  return NextResponse.redirect(login);
}
