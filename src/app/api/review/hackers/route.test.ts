import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ session: vi.fn(), limit: vi.fn(), extract: vi.fn(), report: vi.fn(), upsert: vi.fn(), filters: [] as unknown[][] }));
vi.mock("@/lib/api", () => ({
  requireSession: m.session,
  limitRequest: m.limit,
  apiError: (status: number, error: string) => Response.json({ error }, { status }),
}));
vi.mock("@/lib/ai/report-reader", () => ({
  MAX_REPORT_BYTES: 3 * 1024 * 1024,
  MAX_REPORT_TOTAL_BYTES: 4 * 1024 * 1024,
  isReportImage: (b: Buffer, mime: string) => mime === "image/png" && b[0] === 137,
  extractHackersWrongItems: m.extract,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => ({ from: () => ({ upsert: m.upsert }) }) }));
import { POST } from "./route";

const reportId = "33333333-3333-4333-8333-333333333333";
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
function request(mimes = ["image/png", "image/png"], id = reportId) {
  const form = new FormData();
  form.set("reportId", id);
  mimes.forEach((mime, i) => form.append("file", new File([png], `p${i + 1}.png`, { type: mime })));
  return new Request("https://app.test/api/review/hackers", { method: "POST", body: form });
}
const rows = [
  { number: 1, selected: "A", correctAnswer: "A", result: "correct" },
  { number: 2, selected: "B", correctAnswer: "C", result: "incorrect" },
  { number: 5, selected: null, correctAnswer: "D", result: "incorrect" },
];

beforeEach(() => {
  vi.resetAllMocks();
  m.filters = [];
  vi.stubEnv("GROQ_API_KEY", "key");
  const builder = {
    select() { return builder; },
    eq(...args: unknown[]) { m.filters.push(args); return builder; },
    maybeSingle: m.report,
  };
  m.session.mockResolvedValue({ ok: true, data: { user: { id: "me" }, supabase: { from: () => builder } } });
  m.limit.mockReturnValue(null);
  m.report.mockResolvedValue({ data: { id: reportId, party_id: "party", category: "lc", rows }, error: null });
  m.extract.mockResolvedValue([{ number: 2, content: { question: "Q2", options: [], passage: "", script: "", explanation: "e", explanationSource: "printed" } }]);
  m.upsert.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("결과지로 해커스 오답 채우기", () => {
  it("단어 주관식 오답을 단어 출처로 추출·저장한다", async () => {
    m.report.mockResolvedValue({ data: { id: reportId, party_id: "party", category: "word",
      rows: [{ number: 2, selected: "employer", correctAnswer: "employee", result: "incorrect" }] }, error: null });
    expect((await POST(request())).status).toBe(200);
    expect(m.extract.mock.calls[0][1]).toBe("word");
    expect(m.upsert.mock.calls[0][0][0].source).toBe("hackers_word");
  });
  it("내 채점표의 틀린 번호만 추출하고, 복습 상태는 건드리지 않고 저장한다", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ filled: [2], missing: [5] });
    expect(m.filters).toContainEqual(["user_id", "me"]);
    const [images, category, wrong] = m.extract.mock.calls[0];
    expect(images).toHaveLength(2);
    expect(category).toBe("lc");
    expect(wrong.map((r: { number: number }) => r.number)).toEqual([2, 5]);
    const [saved, options] = m.upsert.mock.calls[0];
    expect(saved).toEqual([expect.objectContaining({ user_id: "me", party_id: "party", source: "hackers_lc", source_ref: reportId, item_number: 2 })]);
    expect(saved[0]).not.toHaveProperty("reviewed_at");
    expect(options).toEqual({ onConflict: "user_id,source,source_ref,item_number" });
  });
  it("남의 채점표나 없는 채점표는 AI를 부르지 않는다", async () => {
    m.report.mockResolvedValue({ data: null, error: null });
    expect((await POST(request())).status).toBe(404);
    expect(m.extract).not.toHaveBeenCalled();
  });
  it.each([
    ["채점표 id가 이상할 때", () => request(["image/png"], "x"), 400],
    ["쪽이 너무 많을 때", () => request(Array(6).fill("image/png")), 400],
    ["이미지가 아닌 쪽이 있을 때", () => request(["image/png", "text/html"]), 415],
  ])("%s 거절한다", async (_label, make, status) => {
    expect((await POST(make())).status).toBe(status);
    expect(m.extract).not.toHaveBeenCalled();
  });
  it("틀린 문제가 없으면 거절한다", async () => {
    m.report.mockResolvedValue({ data: { id: reportId, party_id: "party", category: "rc", rows: [rows[0]] }, error: null });
    expect((await POST(request())).status).toBe(400);
    expect(m.extract).not.toHaveBeenCalled();
  });
  it("하루 읽기 한도를 넘으면 거절한다", async () => {
    m.limit.mockReturnValue(Response.json({ error: "rate_limited" }, { status: 429 }));
    expect((await POST(request())).status).toBe(429);
    expect(m.report).not.toHaveBeenCalled();
  });
  it("AI 오류는 내부 정보 없이 실패로 알리고 저장하지 않는다", async () => {
    m.extract.mockRejectedValue(new Error("provider secret"));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "report_read_failed" });
    expect(m.upsert).not.toHaveBeenCalled();
  });
});
