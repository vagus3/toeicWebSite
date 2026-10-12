import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  requireSession: mocks.session,
  limitRequest: () => null,
  apiError: (status: number, error: string) => Response.json({ error }, { status }),
  parseJson: async (request: Request, schema: z.ZodType) => {
    const parsed = schema.safeParse(await request.json());
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, response: Response.json({ error: "invalid_request" }, { status: 400 }) };
  },
}));
import { POST } from "./route";

const roomId = "33333333-3333-4333-8333-333333333333";
const messageId = "55555555-5555-4555-8555-555555555555";

function request(confirmed: boolean) {
  return new Request("https://app.test/api/chat/confirm", {
    method: "POST",
    body: JSON.stringify({ roomId, messageId, confirmed }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  const filter = {
    eq: (...args: unknown[]) => {
      mocks.eq(...args);
      return mocks.eq.mock.calls.length >= 2 ? Promise.resolve({ error: null }) : filter;
    },
  };
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.remove.mockReturnValue(filter);
  mocks.session.mockResolvedValue({
    ok: true,
    data: { user: { id: "member" }, supabase: { from: () => ({ upsert: mocks.upsert, delete: mocks.remove }) } },
  });
});

describe("AI 답변 확인", () => {
  it("본인 이름으로 확인을 남긴다", async () => {
    expect((await POST(request(true))).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      { message_id: messageId, room_id: roomId, user_id: "member" },
      { onConflict: "message_id,user_id", ignoreDuplicates: true },
    );
  });

  it("취소는 본인 확인만 지운다", async () => {
    expect((await POST(request(false))).status).toBe(200);
    expect(mocks.eq.mock.calls).toEqual([["message_id", messageId], ["user_id", "member"]]);
  });

  it("RLS가 막으면 거절한다", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "new row violates row-level security policy" } });
    expect((await POST(request(true))).status).toBe(403);
  });
});
