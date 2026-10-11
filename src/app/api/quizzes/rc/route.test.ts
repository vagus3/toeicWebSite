import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { rcRequestSchema } from "@/features/quiz/rc-schema";
import { rcFixture } from "../../../../../tests/fixtures/rc";
const m = vi.hoisted(() => ({ session: vi.fn(), generate: vi.fn(), member: vi.fn(), rpc: vi.fn(), responses: {} as Record<string, unknown[]>, updates: [] as unknown[], admin: true }));
vi.mock("@/lib/api", () => ({
  requireSession: m.session, limitRequest: () => null,
  apiError: (status: number, error: string) => Response.json({ error }, { status }),
  parseJson: async (req: Request) => { const r = rcRequestSchema.safeParse(await req.json()); return r.success ? { ok: true, data: r.data } : { ok: false, response: Response.json({}, { status: 400 }) }; },
}));
vi.mock("@/lib/ai/rc-generator", () => ({ generateDailyRc: m.generate }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => m.admin ? {
  rpc: m.rpc,
  from: (table: string) => {
    const finish = () => Promise.resolve(m.responses[table]?.shift() ?? { data: null, error: null });
    const chain = { select: () => chain, eq: () => chain, is: () => chain, lt: () => chain,
      update: (value: unknown) => { m.updates.push(value); return chain; }, upsert: () => chain,
      single: finish, maybeSingle: finish, then: (resolve: (v: unknown) => void) => finish().then(resolve) };
    return chain;
  },
} : null }));
import { POST } from "./route";
const partyId = "11111111-1111-4111-8111-111111111111";
const setId = "22222222-2222-4222-8222-222222222222";
function req(extra = {}) { return new Request("https://app.test/api/quizzes/rc", { method: "POST", body: JSON.stringify({ action: "start", partyId, ...extra }) }); }
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("GROQ_API_KEY", "test-key"); m.admin = true; m.updates = [];
  m.session.mockResolvedValue({ ok: true, data: { user: { id: "user" }, supabase: { from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: m.member }) } } });
  m.member.mockResolvedValue({ data: { user_id: "user" }, error: null });
  m.responses = { daily_rc_sets: [{ error: null }, { data: { id: setId, questions: rcFixture }, error: null }], daily_rc_attempts: [{ data: null, error: null }] };
  m.generate.mockResolvedValue(rcFixture);
});
afterEach(() => vi.unstubAllEnvs());
describe("일일 RC API", () => {
  it("세션과 파티 멤버십을 먼저 검사한다", async () => {
    m.session.mockResolvedValueOnce({ ok: false, response: Response.json({}, { status: 401 }) });
    expect((await POST(req())).status).toBe(401);
    m.member.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(req())).status).toBe(403);
    expect(m.generate).not.toHaveBeenCalled();
  });
  it("캐시된 문제를 재사용하고 정답·해설을 감춘다", async () => {
    const r = await POST(req()); expect(r.status).toBe(200);
    const body = await r.json(); expect(body.questions).toHaveLength(3); expect(body.result).toBeNull();
    expect(body.questions[0]).not.toHaveProperty("answer"); expect(body.questions[0]).not.toHaveProperty("why");
    expect(m.generate).not.toHaveBeenCalled();
  });
  it("이미 완료했다면 저장된 결과와 해설을 반환한다", async () => {
    m.responses.daily_rc_attempts = [{ data: { score: 2, answers: [0, 1, 0] }, error: null }];
    const body = await (await POST(req())).json(); expect(body.result.score).toBe(2); expect(body.result.questions[0].why).toBeTruthy();
  });
  it("생성권을 획득한 요청만 AI를 호출하고 저장한다", async () => {
    m.responses.daily_rc_sets = [{ error: null }, { data: { id: setId, questions: null }, error: null }, { data: { id: setId }, error: null }, { data: { id: setId }, error: null }];
    expect((await POST(req())).status).toBe(200); expect(m.generate).toHaveBeenCalledOnce(); expect(m.updates).toContainEqual({ questions: rcFixture });
  });
  it("다른 요청이 생성 중이면 중복 생성하지 않는다", async () => {
    m.responses.daily_rc_sets = [{ error: null }, { data: { id: setId, questions: null }, error: null }, { data: null, error: null }];
    expect((await POST(req())).status).toBe(409); expect(m.generate).not.toHaveBeenCalled();
  });
  it("생성 실패 시 잠금을 풀고 재시도를 허용한다", async () => {
    m.responses.daily_rc_sets = [{ error: null }, { data: { id: setId, questions: null }, error: null }, { data: { id: setId }, error: null }];
    m.generate.mockRejectedValue(new Error("provider details"));
    const r = await POST(req()); expect(r.status).toBe(502); expect(await r.json()).toEqual({ error: "quiz_generation_failed" });
    expect(m.updates).toContainEqual({ claimed_until: "1970-01-01T00:00:00Z" });
  });
  it("서버가 저장된 문제로 채점 RPC를 호출한다", async () => {
    m.responses.daily_rc_sets = [{ data: { questions: rcFixture }, error: null }];
    m.rpc.mockResolvedValue({ data: { score: 1, answers: [0, 1, 2] }, error: null });
    const r = await POST(req({ action: "submit", setId, answers: [0, 1, 2], score: 3 }));
    expect(r.status).toBe(200); expect((await r.json()).score).toBe(1);
    expect(m.rpc).toHaveBeenCalledWith("submit_daily_rc", { p_set: setId, p_user: "user", p_answers: [0, 1, 2] });
  });
  it("다른 파티 세트와 잘못된 답안은 제출할 수 없다", async () => {
    m.responses.daily_rc_sets = [{ data: null, error: null }];
    expect((await POST(req({ action: "submit", setId, answers: [0, 1, 2] }))).status).toBe(404);
    expect((await POST(req({ action: "submit", setId, answers: [0, 1] }))).status).toBe(400); expect(m.rpc).not.toHaveBeenCalled();
  });
});
