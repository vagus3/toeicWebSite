import { beforeEach, describe, expect, it, vi } from "vitest";
import { studyActionSchema } from "@/features/study/study-schema";
const mocks = vi.hoisted(() => ({
  session: vi.fn(), member: vi.fn(), question: vi.fn(), history: vi.fn(), insert: vi.fn(),
  answer: vi.fn(), configured: vi.fn(), limit: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  requireSession: mocks.session,
  limitRequest: mocks.limit,
  apiError: (status: number, error: string) => Response.json({ error }, { status }),
  parseJson: async (request: Request) => {
    const parsed = studyActionSchema.safeParse(await request.json());
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, response: Response.json({ error: "invalid_request" }, { status: 400 }) };
  },
}));
vi.mock("@/lib/ai/groq", () => ({
  answerTutorConversation: mocks.answer, isAiConfigured: mocks.configured, answerInitialQuestion: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => ({ from: () => ({ insert: mocks.insert }) }),
}));
vi.mock("@/lib/study-server", () => ({ loadStudyCore: vi.fn() }));
import { POST } from "./route";
const partyId = "11111111-1111-4111-8111-111111111111";
const threadId = "22222222-2222-4222-8222-222222222222";
function request(action = "ask-ai", extra = {}) {
  return new Request("https://app.test/api/study", { method: "POST", body: JSON.stringify({ action, partyId, threadId, prompt: "예문을 더 알려줘", ...extra }) });
}
beforeEach(() => {
  vi.resetAllMocks();
  const from = (table: string) => ({
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    maybeSingle: table === "party_members" ? mocks.member : mocks.question,
    limit: mocks.history, insert: mocks.insert,
  });
  mocks.session.mockResolvedValue({ ok: true, data: { user: { id: "caller" }, supabase: { from } } });
  mocks.member.mockResolvedValue({ data: { user_id: "caller" }, error: null });
  mocks.question.mockResolvedValue({ data: { id: threadId, tag: "문법", title: "현재완료란?", ai_answer: "첫 답변" }, error: null });
  mocks.history.mockResolvedValue({ data: [{ prompt: "최근 질문", answer: "최근 답변" }, { prompt: "이전 질문", answer: "이전 답변" }], error: null });
  mocks.configured.mockReturnValue(true);
  mocks.answer.mockResolvedValue("추가 설명");
  mocks.insert.mockResolvedValue({ error: null });
  mocks.limit.mockReturnValue(null);
});
describe("질문별 AI 대화", () => {
  it("로그인하지 않으면 AI를 호출하지 않는다", async () => {
    mocks.session.mockResolvedValue({ ok: false, response: Response.json({}, { status: 401 }) });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("파티 멤버가 아니면 거절한다", async () => {
    mocks.member.mockResolvedValue({ data: null, error: null });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("다른 파티 질문에는 AI 호출이나 기록을 허용하지 않는다", async () => {
    mocks.question.mockResolvedValue({ data: null, error: null });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.history).not.toHaveBeenCalled();
    expect(mocks.answer).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("AI 미설정은 답변으로 저장하지 않는다", async () => {
    mocks.configured.mockReturnValue(false);
    expect((await POST(request())).status).toBe(503);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("질문과 시간순 AI 대화를 참고하고 호출자와 답변을 저장한다", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.answer).toHaveBeenCalledWith("문법", "현재완료란?", "첫 답변", [
      { prompt: "이전 질문", answer: "이전 답변" }, { prompt: "최근 질문", answer: "최근 답변" },
    ], "예문을 더 알려줘");
    expect(mocks.insert).toHaveBeenCalledWith({ question_id: threadId, user_id: "caller", prompt: "예문을 더 알려줘", answer: "추가 설명" });
  });
  it("AI 실패 시 제공업체 오류를 노출하거나 가짜 답변을 저장하지 않는다", async () => {
    mocks.answer.mockRejectedValue(new Error("provider secret detail"));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "ai_failed" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("저장이 실패하면 성공 응답을 반환하지 않는다", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "database failure" } });
    expect((await POST(request())).status).toBe(500);
  });
  it("AI 장애 중에도 파티원 댓글은 저장한다", async () => {
    mocks.configured.mockReturnValue(false);
    expect((await POST(request("reply", { text: "다른 풀이" }))).status).toBe(200);
    expect(mocks.answer).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledWith({ question_id: threadId, user_id: "caller", body: "다른 풀이" });
  });
  it("빈 프롬프트와 길이 초과 요청을 거절한다", async () => {
    expect((await POST(request("ask-ai", { prompt: "   " }))).status).toBe(400);
    expect((await POST(request("ask-ai", { prompt: "a".repeat(2001) }))).status).toBe(400);
    expect(mocks.answer).not.toHaveBeenCalled();
  });
});
