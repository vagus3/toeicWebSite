/** 클라이언트 → Route Handler JSON 요청. 실패 응답이면 본문을 담아 throw */
export async function requestJson<T = unknown>(url: string, body: unknown, method: "POST" | "DELETE" = "POST"): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new HttpError(res.status, await res.text());
  return res.json() as Promise<T>;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(body || `HTTP ${status}`);
  }
}

/** 서버에 기능 키가 없어서 건너뛴 경우(501) — 데모 모드에서는 성공처럼 취급한다 */
export function isNotConfigured(error: unknown) {
  return error instanceof HttpError && error.status === 501;
}
