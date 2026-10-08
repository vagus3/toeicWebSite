"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EnvelopeSimpleOpen, GoogleLogo } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { TextField } from "@/components/ui/text-field";
import { ME, PARTY } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { authSchema, TRACKS, type AuthForm, type AuthMode } from "./auth-schema";
import { AuthIntro } from "./auth-intro";
import { useAuthActions } from "./use-auth-actions";

function InviteBanner() {
  return (
    <div className="card elev-sm flex-row items-center gap-3 px-3.5 py-3">
      <EnvelopeSimpleOpen className="text-icon-md text-accent" />
      <span className="flex-1 text-meta">
        <b className="font-medium">{ME.inviter}</b>님이 <b className="font-medium">{PARTY.name}</b>에 초대했어요
      </span>
    </div>
  );
}

function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-label text-muted">
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-divider" />
      {label}
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-divider" />
    </div>
  );
}

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const isSignup = mode === "signup";
  const { invite, continueWithGoogle, submitEmail, resetPassword, switchMode } = useAuthActions(mode);

  const { register, handleSubmit, formState, setError, getValues } = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: { mode, nickname: "", email: "", password: "", track: "800", agree: true },
  });
  const { errors } = formState;

  const onSubmit = handleSubmit(async (values) => {
    const message = await submitEmail(values);
    if (message) setError("root", { message });
  });

  const onResetPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    const email = getValues("email");
    if (!email) return setError("email", { message: "재설정 메일을 받을 이메일을 적어 주세요" });
    await resetPassword(email);
  };

  return (
    <div className="flex min-h-dvh flex-wrap bg-bg text-text">
      <AuthIntro />

      <section className="relative flex min-w-0 flex-1 basis-col-half flex-col justify-center gap-6 px-auth-x py-12">
        <ThemeToggle variant="secondary" className="absolute top-6 right-6 text-meta" />
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-auth flex-col gap-5">
          {(Boolean(invite) || !isSupabaseConfigured) && <InviteBanner />}

          <div className="seg self-start" role="radiogroup" aria-label="로그인 또는 회원가입">
            {(["login", "signup"] as const).map((m) => (
              <label key={m} className="seg-opt">
                <input type="radio" name="auth-mode" checked={mode === m} onChange={() => switchMode(m)} />
                {m === "login" ? "로그인" : "회원가입"}
              </label>
            ))}
          </div>

          <h2 className="m-0 text-h3">{isSignup ? "계정 만들고 파티 참가" : "다시 오셨네요"}</h2>

          <Button variant="secondary" className="h-control-lg text-body" onClick={continueWithGoogle}>
            <GoogleLogo className="text-icon" />
            Google로 계속하기
          </Button>
          <span className="-mt-2.5 text-label text-muted">Google로 가입하면 인증 사진 저장용 드라이브 폴더가 바로 연결돼요</span>

          <OrDivider label="또는 이메일" />

          {isSignup && <TextField id="nickname" label="닉네임" placeholder="파티에서 보일 이름" autoComplete="nickname" error={errors.nickname?.message} {...register("nickname")} />}
          <TextField id="email" label="이메일" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <TextField
            id="password"
            label="비밀번호"
            type="password"
            placeholder="8자 이상"
            autoComplete={isSignup ? "new-password" : "current-password"}
            error={errors.password?.message}
            {...register("password")}
          />

          {isSignup && (
            <>
              <div className="field">
                <label>목표 점수 트랙</label>
                <div className="seg w-full" role="radiogroup" aria-label="목표 점수 트랙">
                  {TRACKS.map((t) => (
                    <label key={t} className="seg-opt flex-1 justify-center">
                      <input type="radio" value={t} {...register("track")} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <label className="radio text-meta">
                <input type="checkbox" {...register("agree")} />
                <span className="dot rounded-sm" />
                이용약관 및 개인정보 처리방침 동의
              </label>
              <FieldError message={errors.agree?.message} />
            </>
          )}

          <FieldError message={errors.root?.message} />
          <Button type="submit" variant="primary" className="h-control-lg text-base" disabled={formState.isSubmitting}>
            {isSignup ? "가입하고 파티 참가" : "로그인"}
          </Button>

          {!isSignup && (
            <div className="flex justify-between text-meta">
              <a href="#" className="no-underline" onClick={onResetPassword}>
                비밀번호 찾기
              </a>
              <Button variant="ghost" className="text-meta" onClick={() => switchMode("signup")}>
                처음이에요 · 회원가입
              </Button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
