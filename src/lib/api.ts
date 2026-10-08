import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { clientKey, rateLimit } from "./rate-limit";
import { getSessionUser, getSupabaseServerClient } from "./supabase/server";

type Result<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export function apiError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** 서버에 기능 키가 없어서 건너뜀 — 클라이언트는 데모 모드로 처리한다 */
export function notConfigured(reason: string) {
  return NextResponse.json({ skipped: true, reason }, { status: 501 });
}

/** JSON 본문을 zod로 검증 — 실패하면 400 */
export async function parseJson<S extends z.ZodType>(request: Request, schema: S): Promise<Result<z.infer<S>>> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, response: apiError(400, "invalid_request", { issues: parsed.error.issues }) };
}

/** 사용자(없으면 IP) 기준 고정 창 Rate Limit — 넘으면 429 */
export function limitRequest(request: Request, scope: string, userId: string | null | undefined, limit: number, windowMs: number) {
  const { ok } = rateLimit(`${scope}:${clientKey(request, userId)}`, limit, windowMs);
  return ok ? null : apiError(429, "rate_limited");
}

/** 로그인 필수 API — Supabase 미설정이면 501, 세션 없으면 401 */
export async function requireSession(): Promise<Result<{ supabase: SupabaseClient; user: User }>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, response: notConfigured("supabase_not_configured") };
  const user = await getSessionUser();
  if (!user) return { ok: false, response: apiError(401, "unauthorized") };
  return { ok: true, data: { supabase, user } };
}
