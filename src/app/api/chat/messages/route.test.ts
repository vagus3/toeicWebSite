import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  limit: vi.fn(),
  configured: vi.fn(),
  answer: vi.fn(),
  admin: vi.fn(),
  adminInsert: vi.fn(),
  upsert: vi.fn(),
  saved: { current: { id: "question-1" } as { id: string } | null },
  after: [] as (() => unknown)[],
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => {
    mocks.after.push(task);
  },
}));
vi.mock("@/lib/api", () => ({
  requireSession: mocks.session,
  limitRequest: mocks.limit,
  apiError: (status: number, error: string) => Response.json({ error }, { status }),
  parseJson: async (request: Request, schema: z.ZodType) => {
    const parsed = schema.safeParse(await request.json());
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, response: Response.json({ error: "invalid_request" }, { status: 400 }) };
  },
}));
vi.mock("@/lib/ai/groq", () => ({ answerChatQuestion: mocks.answer, isAiConfigured: mocks.configured }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: mocks.admin }));
vi.mock("@/lib/push/web-push", () => ({ sendPushToUsers: vi.fn() }));
import { AI_FAILED_NOTICE } from "@/features/chat/chat-schema";
import { POST } from "./route";

const roomId = "33333333-3333-4333-8333-333333333333";
const partyId = "44444444-4444-4444-8444-444444444444";

/** 푸시 조회용 체인 — 어떤 select/eq/neq/single 조합으로 기다려도 빈 결과를 준다 */
function lookup() {
  const result = { data: null, error: null };
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "eq", "neq"]) chain[name] = () => chain;
  chain.single = async () => result;
  chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null });
  return chain;
}

function request(content: string, clientId = crypto.randomUUID()) {
  return new Request("https://app.test/api/chat/messages", {
    method: "POST",
    body: JSON.stringify({ roomId, partyId, content, clientId }),
  });
}

async function runAfterTasks() {
  for (const task of mocks.after.splice(0)) await task();
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.after.length = 0;
  mocks.saved.current = { id: "question-1" };
  const supabase = {
    from: (table: string) =>
      table === "chat_messages"
        ? {
            upsert: (...args: unknown[]) => {
              mocks.upsert(...args);
              return { select: () => ({ maybeSingle: async () => ({ data: mocks.saved.current, error: null }) }) };
            },
          }
        : lookup(),
  };
  mocks.session.mockResolvedValue({ ok: true, data: { user: { id: "asker" }, supabase } });
  mocks.limit.mockReturnValue(null);
  mocks.configured.mockReturnValue(true);
  mocks.admin.mockReturnValue({ from: () => ({ insert: mocks.adminInsert }) });
  mocks.adminInsert.mockResolvedValue({ error: null });
  mocks.answer.mockResolvedValue("현재완료는 과거의 일이 지금까지 이어질 때 써요.");
});

describe("채팅 메시지 전송", () => {
  it("일반 메시지는 AI를 부르지 않는다", async () => {
    expect((await POST(request("오늘 LC 다들 했어?"))).status).toBe(200);
    await runAfterTasks();
    expect(mocks.upsert.mock.calls[0][0]).toMatchObject({ message_type: "text", sender_id: "asker" });
    expect(mocks.answer).not.toHaveBeenCalled();
    expect(mocks.adminInsert).not.toHaveBeenCalled();
  });

  it("AI가 준비되지 않았으면 @AI 질문을 저장하지 않는다", async () => {
    mocks.configured.mockReturnValue(false);
    expect((await POST(request("@AI 현재완료가 뭐야?"))).status).toBe(503);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("하루 AI 한도를 넘으면 @AI 질문을 저장하지 않는다", async () => {
    mocks.limit.mockImplementation((_request: Request, scope: string) =>
      scope === "study-ai" ? Response.json({ error: "rate_limited" }, { status: 429 }) : null,
    );
    const response = await POST(request("@AI 현재완료가 뭐야?"));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "ai_limit_reached" });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("@AI 질문은 응답 뒤에 질문에 이어지는 AI 답변을 저장한다", async () => {
    expect((await POST(request("@AI야 현재완료가 뭐야?"))).status).toBe(200);
    expect(mocks.answer).not.toHaveBeenCalled();
    await runAfterTasks();
    expect(mocks.answer).toHaveBeenCalledWith("현재완료가 뭐야?");
    expect(mocks.adminInsert).toHaveBeenCalledWith({
      room_id: roomId,
      sender_id: "asker",
      reply_to: "question-1",
      message_type: "ai",
      content: "현재완료는 과거의 일이 지금까지 이어질 때 써요.",
    });
  });

  it("AI가 실패하면 질문 아래에 안내를 남긴다", async () => {
    mocks.answer.mockRejectedValue(new Error("ai_provider_failed"));
    await POST(request("@AI 현재완료가 뭐야?"));
    await runAfterTasks();
    expect(mocks.adminInsert).toHaveBeenCalledWith(
      expect.objectContaining({ message_type: "system", reply_to: "question-1", content: AI_FAILED_NOTICE }),
    );
  });

  it("너무 긴 AI 답변은 DB 제한에 맞춰 자른다", async () => {
    mocks.answer.mockResolvedValue("가".repeat(7000));
    await POST(request("@AI 길게 설명해 줘"));
    await runAfterTasks();
    const content = mocks.adminInsert.mock.calls[0][0].content as string;
    expect(content).toHaveLength(6000);
    expect(content.endsWith("…")).toBe(true);
  });

  it("같은 요청을 다시 보내면 답변을 또 만들지 않는다", async () => {
    mocks.saved.current = null;
    await POST(request("@AI 현재완료가 뭐야?"));
    await runAfterTasks();
    expect(mocks.answer).not.toHaveBeenCalled();
    expect(mocks.adminInsert).not.toHaveBeenCalled();
  });
});
