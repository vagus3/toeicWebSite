"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PARTY } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/stores/toast-store";
import type { AuthForm, AuthMode } from "./auth-schema";

/** Google 로그인 시 드라이브 업로드 권한(drive.file)도 함께 요청 */
const GOOGLE_SCOPES = "openid email profile https://www.googleapis.com/auth/drive.file";

/** OAuth·이메일 링크가 돌아올 /auth/callback 주소 */
function authCallbackUrl(params: Record<string, string | null>) {
  const url = new URL("/auth/callback", window.location.origin);
  Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
  return url.toString();
}

/**
 * 로그인·가입·비밀번호 재설정 — Supabase 키가 없으면 데모로 바로 입장
 * 실패하면 메시지를 돌려주고, 성공하면 원래 가려던 곳(next)으로 이동
 */
export function useAuthActions(mode: AuthMode) {
  const router = useRouter();
  const params = useSearchParams();
  const flash = useToast((s) => s.flash);
  const invite = params.get("invite");
  const next = params.get("next") ?? ROUTES.dashboard;

  const enterApp = () => {
    flash(mode === "signup" ? `${PARTY.name}에 참가했어요` : "로그인했어요");
    router.push(next);
  };

  const continueWithGoogle = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return enterApp();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl({ next, invite }),
        scopes: GOOGLE_SCOPES,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  const submitEmail = async (values: AuthForm): Promise<string | null> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      enterApp();
      return null;
    }
    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: { data: { nickname: values.nickname, track: values.track, invite } },
          })
        : await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });
    if (error) return error.message;
    enterApp();
    return null;
  };

  const resetPassword = async (email: string) => {
    await getSupabaseBrowserClient()?.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl({ next: ROUTES.dashboard }),
    });
    flash("비밀번호 재설정 메일을 보냈어요");
  };

  /** 로그인 ↔ 회원가입 — 초대 코드 등 쿼리는 유지 */
  const switchMode = (to: AuthMode) => {
    const query = params.toString();
    router.replace(`${to === "login" ? ROUTES.login : ROUTES.signup}${query ? `?${query}` : ""}`);
  };

  return { invite, continueWithGoogle, submitEmail, resetPassword, switchMode };
}
