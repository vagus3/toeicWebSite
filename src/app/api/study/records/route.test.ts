import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ session: vi.fn(), calls: [] as [string, unknown[]][], result: vi.fn() }));
vi.mock("@/lib/api", () => ({
  requireSession: m.session,
  apiError: (status: number, error: string) => Response.json({ error }, { status }),
}));
import { GET } from "./route";
import { monthRange, shiftRecordsMonth } from "@/features/records/records-schema";

const partyId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const url = (q: string) => new Request(`https://app.test/api/study/records?${q}`);
const called = (name: string) => m.calls.filter(([n]) => n === name).map(([, args]) => args);

beforeEach(() => {
  vi.resetAllMocks();
  m.calls = [];
  // 호출한 필터를 기록하고 마지막 limit에서 결과를 돌려주는 쿼리 빌더
  const builder: Record<string, unknown> = {};
  for (const name of ["select", "eq", "gte", "lt", "order"])
    builder[name] = (...args: unknown[]) => { m.calls.push([name, args]); return builder; };
  builder.limit = (...args: unknown[]) => { m.calls.push(["limit", args]); return m.result(); };
  m.session.mockResolvedValue({ ok: true, data: { user: { id: "viewer" }, supabase: { from: () => builder } } });
  m.result.mockResolvedValue({ data: [], error: null });
});

describe("인증 기록 목록", () => {
  it("로그인하지 않으면 조회하지 않는다", async () => {
    m.session.mockResolvedValue({ ok: false, response: Response.json({}, { status: 401 }) });
    expect((await GET(url(`partyId=${partyId}&month=2026-10`))).status).toBe(401);
    expect(m.calls).toHaveLength(0);
  });
  it.each([
    [`partyId=${partyId}&month=2026-13`],
    [`partyId=not-a-uuid&month=2026-10`],
    [`partyId=${partyId}&month=2026-10&category=essay`],
    [`partyId=${partyId}&month=2026-10&memberId=1`],
  ])("잘못된 조건은 거절한다: %s", async (q) => {
    expect((await GET(url(q))).status).toBe(400);
    expect(m.calls).toHaveLength(0);
  });
  it("파티·월 범위로 증빙 있는 기록만 최신순으로 읽고 멤버·항목 필터를 건다", async () => {
    expect((await GET(url(`partyId=${partyId}&month=2026-12&memberId=${memberId}&category=rc`))).status).toBe(200);
    expect(called("select")[0][0]).toContain("study_evidences!inner(id)");
    expect(called("eq")).toEqual([["party_id", partyId], ["user_id", memberId], ["category", "rc"]]);
    expect(called("gte")).toEqual([["study_date", "2026-12-01"]]);
    expect(called("lt")).toEqual([["study_date", "2027-01-01"]]);
    expect(called("order")[0]).toEqual(["study_date", { ascending: false }]);
    expect(called("limit")).toEqual([[200]]);
  });
  it("해커스 채점표를 붙여 응답 형태로 바꾼다", async () => {
    m.result.mockResolvedValue({
      data: [
        { id: "log-1", user_id: memberId, category: "rc", study_date: "2026-10-12", created_at: "t",
          hackers_rc_reports: [{ id: "r1", category: "rc", total: 10, correct: 7, test_date: "2026-10-11", rows: [] }] },
        { id: "log-2", user_id: memberId, category: "word", study_date: "2026-10-12", created_at: "t", hackers_rc_reports: [] },
      ],
      error: null,
    });
    const { records } = await (await GET(url(`partyId=${partyId}&month=2026-10`))).json();
    expect(records[0]).toMatchObject({ id: "log-1", studyDate: "2026-10-12", report: { correct: 7, testDate: "2026-10-11" } });
    expect(records[1].report).toBeNull();
  });
  it("조회 오류는 내부 정보 없이 실패로 알린다", async () => {
    m.result.mockResolvedValue({ data: null, error: { message: "secret detail" } });
    const response = await GET(url(`partyId=${partyId}&month=2026-10`));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "load_failed" });
  });
});

describe("월 계산", () => {
  it("12월은 다음 해 1월 1일 전까지다", () => {
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
  });
  it("월 이동은 연도를 넘긴다", () => {
    expect(shiftRecordsMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftRecordsMonth("2026-12", 1)).toBe("2027-01");
  });
});
