import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ connect: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/google-drive/personal-drive", () => ({ connectPersonalDrive: mocks.connect }));
import { GET } from "./route";
import { createDriveState, DRIVE_STATE_COOKIE } from "@/lib/google-drive/oauth-state";

function request(valid = true) {
  const saved = createDriveState("user");
  const req = new NextRequest(`https://app.test/auth/drive/callback?state=${saved.state}&code=private-code`);
  if (valid) req.cookies.set(DRIVE_STATE_COOKIE, JSON.stringify(saved));
  return req;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.connect.mockResolvedValue(undefined);
});
describe("Drive callback", () => {
  it("returns connected and clears the one-time state cookie", async () => {
    const response = await GET(request());
    expect(response.headers.get("location")).toBe("https://app.test/me?drive=connected");
    expect(response.cookies.get(DRIVE_STATE_COOKIE)?.value).toBe("");
    expect(mocks.connect).toHaveBeenCalledWith("user", "private-code", "https://app.test/auth/drive/callback");
  });
  it("does not exchange a code without valid state", async () => {
    const response = await GET(request(false));
    expect(response.headers.get("location")).toContain("drive=invalid_state");
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it("reports disabled API without logging the original error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.connect.mockRejectedValue({ message: "private-token", response: { data: { error: { details: [{ reason: "SERVICE_DISABLED" }] } } } });
      const response = await GET(request());
      expect(response.headers.get("location")).toBe("https://app.test/me?drive=api_disabled");
      expect(log).toHaveBeenCalledExactlyOnceWith("drive_connection_failed", { reason: "api_disabled" });
    } finally { log.mockRestore(); }
  });
});
