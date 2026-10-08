import "server-only";

/**
 * 인스턴스 메모리 기반의 간단한 고정 창 Rate Limit.
 * 4~10명 규모 MVP용 — 사용자가 늘면 Supabase 테이블이나 Upstash로 옮긴다.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) return { ok: false, remaining: 0 };
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

export function clientKey(request: Request, userId?: string | null) {
  return userId ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}
