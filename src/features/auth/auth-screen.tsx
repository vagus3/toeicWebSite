"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EnvelopeSimpleOpen, GoogleLogo } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { TextField } from "@/components/ui/text-field";
import {
  type InvitePreview,
  partyErrorMessage,
} from "@/features/party/party-schema";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  authSchema,
  TRACKS,
  type AuthForm,
  type AuthMode,
} from "./auth-schema";
import { AuthIntro } from "./auth-intro";
import { useAuthActions } from "./use-auth-actions";

function InviteBanner({ code }: { code: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["invite", code],
    queryFn: async (): Promise<InvitePreview> => {
      const response = await fetch(
        `/api/parties/invite?code=${encodeURIComponent(code)}`,
      );
      if (!response.ok)
        throw new Error(
          response.status === 404 || response.status === 400
            ? "invalid_invite"
            : "unavailable",
        );
      return response.json();
    },
    retry: false,
  });
  if (!isSupabaseConfigured)
    return (
      <p className="text-meta text-muted">
        초대 링크로 접속했어요. 현재 데모에서는 실제 파티 참가가 지원되지
        않아요.
      </p>
    );
  if (isPending)
    return (
      <p role="status" className="text-meta text-muted">
        초대 정보를 확인하고 있어요…
      </p>
    );
  if (error || !data)
    return (
      <p role="alert" className="text-meta text-muted">
        {partyErrorMessage(error?.message ?? "")}
      </p>
    );
  return (
    <div className="card elev-sm flex-row items-center gap-3 px-3.5 py-3">
      <EnvelopeSimpleOpen className="text-icon-md text-accent" />
      <span className="flex-1 text-meta">
        <b className="font-medium">{data.inviterName}</b>님이{" "}
        <b className="font-medium">{data.partyName}</b>에 초대했어요
        {data.memberCount >= data.capacity && (
          <span className="block text-muted">현재 정원이 가득 찼어요</span>
        )}
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
  const {
    invite,
    authError,
    continueWithGoogle,
    submitEmail,
    resetPassword,
    switchMode,
  } = useAuthActions(mode);

  const { register, handleSubmit, formState, setError, getValues } =
    useForm<AuthForm>({
      resolver: zodResolver(authSchema),
      defaultValues: {
        mode,
        nickname: "",
        email: "",
        password: "",
        track: "800",
        agree: true,
      },
    });
  const { errors } = formState;

  const onSubmit = handleSubmit(async (values) => {
    const message = await submitEmail(values);
    if (message) setError("root", { message });
  });

  const onResetPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    const email = getValues("email");
    if (!email)
      return setError("email", {
        message: "재설정 메일을 받을 이메일을 적어 주세요",
      });
    await resetPassword(email);
  };

  return (
    <div className="flex min-h-dvh flex-wrap bg-bg text-text">
      <AuthIntro />

      <section className="relative flex min-w-0 flex-1 basis-col-half flex-col justify-center gap-6 px-auth-x py-12">
        <ThemeToggle
          variant="secondary"
          className="absolute top-6 right-6 text-meta"
        />
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex w-full max-w-auth flex-col gap-5"
        >
          {invite && <InviteBanner code={invite} />}
          {authError && (
            <p role="alert" className="text-meta text-muted">
              {authError === "party_full" || authError === "invalid_invite"
                ? partyErrorMessage(authError)
                : "로그인을 완료하지 못했어요. 다시 시도해 주세요"}
            </p>
          )}

          <div
            className="seg self-start"
            role="radiogroup"
            aria-label="로그인 또는 회원가입"
          >
            {(["login", "signup"] as const).map((m) => (
              <label key={m} className="seg-opt">
                <input
                  type="radio"
                  name="auth-mode"
                  checked={mode === m}
                  onChange={() => switchMode(m)}
                />
                {m === "login" ? "로그인" : "회원가입"}
              </label>
            ))}
          </div>

          <h2 className="m-0 text-h3">
            {isSignup
              ? invite
                ? "계정 만들고 파티 참가"
                : "계정 만들기"
              : "다시 오셨네요"}
          </h2>

          <Button
            variant="secondary"
            className="h-control-lg text-body"
            onClick={continueWithGoogle}
          >
            <GoogleLogo className="text-icon" />
            Google로 계속하기
          </Button>
          <span className="-mt-2.5 text-label text-muted">
            Google 계정으로 간편하게 로그인할 수 있어요
          </span>

          <OrDivider label="또는 이메일" />

          {isSignup && (
            <TextField
              id="nickname"
              label="닉네임"
              placeholder="파티에서 보일 이름"
              autoComplete="nickname"
              error={errors.nickname?.message}
              {...register("nickname")}
            />
          )}
          <TextField
            id="email"
            label="이메일"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
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
                <div
                  className="seg w-full"
                  role="radiogroup"
                  aria-label="목표 점수 트랙"
                >
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
                <span>
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    이용약관
                  </Link>
                  {" 및 "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    개인정보처리방침
                  </Link>
                  {" 동의"}
                </span>
              </label>
              <FieldError message={errors.agree?.message} />
            </>
          )}

          <FieldError message={errors.root?.message} />
          <Button
            type="submit"
            variant="primary"
            className="h-control-lg text-base"
            disabled={formState.isSubmitting}
          >
            {isSignup ? (invite ? "가입하고 파티 참가" : "회원가입") : "로그인"}
          </Button>

          {!isSignup && (
            <div className="flex justify-between text-meta">
              <a href="#" className="no-underline" onClick={onResetPassword}>
                비밀번호 찾기
              </a>
              <Button
                variant="ghost"
                className="text-meta"
                onClick={() => switchMode("signup")}
              >
                처음이에요 · 회원가입
              </Button>
            </div>
          )}
        </form>
        <nav
          aria-label="서비스 정책"
          className="flex flex-wrap gap-4 text-meta text-muted"
        >
          <Link href="/privacy" target="_blank" rel="noopener noreferrer">
            개인정보처리방침
          </Link>
          <Link href="/terms" target="_blank" rel="noopener noreferrer">
            이용약관
          </Link>
        </nav>
      </section>
    </div>
  );
}
