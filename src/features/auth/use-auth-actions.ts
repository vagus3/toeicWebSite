"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { requestJson } from "@/lib/http";
import { ROUTES } from "@/lib/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/stores/toast-store";
import { partyErrorMessage, safeNextPath } from "@/features/party/party-schema";
import type { AuthForm, AuthMode } from "./auth-schema";

function authCallbackUrl(params: Record<string, string | null>) {
  const url = new URL("/auth/callback", window.location.origin);
  Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
  return url.toString();
}

export function useAuthActions(mode: AuthMode) {
  const router = useRouter();
  const params = useSearchParams();
  const flash = useToast((s) => s.flash);
  const invite = params.get("invite")?.trim() || null;
  const next = safeNextPath(params.get("next"));

  const enterApp = async () => {
    if (invite && getSupabaseBrowserClient()) {
      try {
        await requestJson("/api/parties/join", { code: invite });
      } catch (error) {
        return partyErrorMessage(error instanceof Error ? error.message : "");
      }
      flash("파티에 참가했어요");
    } else flash("로그인했어요");
    router.push(invite ? ROUTES.dashboard : next);
    router.refresh();
    return null;
  };

  const continueWithGoogle = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      await enterApp();
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl({ next, invite }) },
    });
    if (error)
      flash("Google 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요");
  };

  const submitEmail = async (values: AuthForm): Promise<string | null> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return enterApp();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { nickname: values.nickname, track: values.track },
            emailRedirectTo: authCallbackUrl({ next, invite }),
          },
        });
        if (error) return error.message;
        if (!data.session) {
          flash(
            "가입 확인 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료해 주세요",
          );
          return null;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) return error.message;
      }
      return await enterApp();
    } catch {
      return "로그인하지 못했어요. 잠시 후 다시 시도해 주세요";
    }
  };

  const resetPassword = async (email: string) => {
    const { error } =
      (await getSupabaseBrowserClient()?.auth.resetPasswordForEmail(email, {
        redirectTo: authCallbackUrl({ next: ROUTES.dashboard }),
      })) ?? {};
    flash(
      error
        ? "재설정 메일을 보내지 못했어요"
        : "비밀번호 재설정 메일을 보냈어요",
    );
  };
  const switchMode = (to: AuthMode) => {
    const query = params.toString();
    router.replace(
      `${to === "login" ? ROUTES.login : ROUTES.signup}${query ? `?${query}` : ""}`,
    );
  };
  return {
    invite,
    authError: params.get("error"),
    continueWithGoogle,
    submitEmail,
    resetPassword,
    switchMode,
  };
}
