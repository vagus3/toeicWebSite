import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ session: vi.fn(), limit: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/api", () => ({
  requireSession: m.session,
  limitRequest: m.limit,
  apiError: (status: number, error: string) => Response.json({ error }, { status }),
  parseJson: async (request: Request, schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } }) => {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, response: Response.json({ error: "invalid_request" }, { status: 400 }) };
  },
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: m.admin }));
import { GET, PATCH } from "./route";

const partyId = "11111111-1111-4111-8111-111111111111";
const setId = "22222222-2222-4222-8222-222222222222";
const reportId = "33333333-3333-4333-8333-333333333333";

/** 어떤 체인 메서드든 기록하고, await·maybeSingle에서 정한 결과를 돌려주는 쿼리 */
function query(result: () => unknown) {
  const calls: [string, unknown[]][] = [];
  const builder: object = new Proxy({}, {
    get(_, prop: string) {
      if (prop === "then") return (ok: (v: unknown) => void, fail: (e: unknown) => void) => Promise.resolve(result()).then(ok, fail);
      if (prop === "maybeSingle") return () => Promise.resolve(result());
      return (...args: unknown[]) => { calls.push([prop, args]); return builder; };
    },
  });
  return { builder, calls, args: (name: string) => calls.filter(([n]) => n === name).map(([, a]) => a) };
}
const rcQuestions = [5, 6, 7].map((part, i) => ({
  part, skill: "s", passage: part === 5 ? "" : "P".repeat(120) + " ______ ", text: part === 5 ? "Text ______ here" : "Which?",
  opts: ["o1", "o2", "o3", "o4"], answer: i, why: "why",
}));
let tables: Record<string, ReturnType<typeof query>>;
let adminTables: Record<string, ReturnType<typeof query>>;

beforeEach(() => {
  vi.resetAllMocks();
  tables = {
    party_members: query(() => ({ data: { user_id: "me" }, error: null })),
    quiz_attempts: query(() => ({ data: [{ id: "44444444-4444-4444-8444-444444444444", taken_on: "2026-10-11", answers: [1, 0, 0] }], error: null })),
    hackers_rc_reports: query(() => ({ data: [{ id: reportId, category: "lc", test_date: "2026-10-10", rows: [{ number: 4, selected: "A", correctAnswer: "B", result: "incorrect" }] }], error: null })),
    review_notes: query(() => ({ data: [{ source: "daily_rc", source_ref: setId, item_number: 2, content: null, reviewed_at: "2026-10-12T01:00:00Z" }], error: null })),
  };
  adminTables = {
    daily_rc_attempts: query(() => ({
      data: [
        { set_id: setId, answers: [0, 3, 2], daily_rc_sets: { study_date: "2026-10-12", questions: rcQuestions } },
        { set_id: "broken", answers: [0], daily_rc_sets: { study_date: "2026-10-12", questions: [] } },
      ],
      error: null,
    })),
  };
  m.session.mockResolvedValue({ ok: true, data: { user: { id: "me" }, supabase: { from: (t: string) => tables[t].builder } } });
  m.admin.mockReturnValue({ from: (t: string) => adminTables[t].builder });
  m.limit.mockReturnValue(null);
});

describe("오답노트 조회", () => {
  const get = (q = `partyId=${partyId}`) => GET(new Request(`https://app.test/api/review?${q}`));
  it("해커스 단어를 RC로 바꾸지 않고 주관식 답과 함께 돌려준다", async () => {
    tables.hackers_rc_reports = query(() => ({ data: [{ id: reportId, category: "word", test_date: "2026-10-13",
      rows: [{ number: 4, selected: "employer", correctAnswer: "employee", result: "incorrect" }] }], error: null }));
    const { items } = await (await get()).json();
    expect(items.find((i: { source: string }) => i.source === "hackers_word")).toMatchObject({
      number: 4, myAnswerText: "employer", correctAnswerText: "employee", myAnswer: null, correctAnswer: null,
    });
  });
  it("로그인하지 않았거나 파티 id가 이상하면 읽지 않는다", async () => {
    m.session.mockResolvedValueOnce({ ok: false, response: Response.json({}, { status: 401 }) });
    expect((await get()).status).toBe(401);
    expect((await get("partyId=x")).status).toBe(400);
    expect(m.admin).not.toHaveBeenCalled();
  });
  it("파티원이 아니면 서버 전용 일일 RC 기록을 읽지 않는다", async () => {
    tables.party_members = query(() => ({ data: null, error: null }));
    expect((await get()).status).toBe(403);
    expect(m.admin).not.toHaveBeenCalled();
  });
  it("내 기록만 모아 출처별 오답과 복습 상태를 돌려준다", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    const { items } = await response.json();
    expect(items.map((i: { source: string; number: number }) => `${i.source}:${i.number}`)).toEqual([
      "daily_rc:2", "word:1", "hackers_lc:4",
    ]);
    expect(items[0].reviewed).toBe(true);
    expect(adminTables.daily_rc_attempts.args("eq")).toEqual([["user_id", "me"], ["daily_rc_sets.party_id", partyId]]);
    for (const t of ["quiz_attempts", "hackers_rc_reports", "review_notes"])
      expect(tables[t].args("eq")).toContainEqual(["user_id", "me"]);
  });
  it("조회 오류는 실패로 알린다", async () => {
    tables.review_notes = query(() => ({ data: null, error: { message: "x" } }));
    expect((await get()).status).toBe(500);
  });
});

describe("복습 완료 표시", () => {
  const patch = (body: unknown, origin = "https://app.test") =>
    PATCH(new Request("https://app.test/api/review", { method: "PATCH", headers: { origin }, body: JSON.stringify(body) }));
  const body = { partyId, source: "hackers_lc", sourceRef: reportId, number: 4, reviewed: true };
  beforeEach(() => { tables.review_notes = query(() => ({ error: null })); });
  it("다른 출처의 요청과 잘못된 값은 거절한다", async () => {
    expect((await patch(body, "https://evil.test")).status).toBe(403);
    expect((await patch({ ...body, number: 0 })).status).toBe(400);
    expect(tables.review_notes.calls).toHaveLength(0);
  });
  it("본인 행으로 복습 시각을 upsert하고, 해제하면 비운다", async () => {
    expect((await patch(body)).status).toBe(200);
    const [row, options] = tables.review_notes.args("upsert")[0] as [Record<string, unknown>, unknown];
    expect(row).toMatchObject({ user_id: "me", party_id: partyId, source: "hackers_lc", source_ref: reportId, item_number: 4 });
    expect(row.reviewed_at).toEqual(expect.any(String));
    expect(row).not.toHaveProperty("content");
    expect(options).toEqual({ onConflict: "user_id,source,source_ref,item_number" });
    await patch({ ...body, reviewed: false });
    expect((tables.review_notes.args("upsert")[1][0] as Record<string, unknown>).reviewed_at).toBeNull();
  });
  it("RLS가 막으면 403으로 알린다", async () => {
    tables.review_notes = query(() => ({ error: { code: "42501" } }));
    expect((await patch(body)).status).toBe(403);
  });
});
