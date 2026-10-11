import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), rpc: vi.fn(), remove: vi.fn(), ack: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: mocks.admin }));
import { GET } from "./route";

describe("daily retention endpoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  const request = () => new Request("https://app.test/api/cron/retention", {
    headers: { authorization: "Bearer test-cron-secret" },
  });
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deletion = { eq: vi.fn().mockReturnThis(), then: (resolve: (value: unknown) => void) => resolve(mocks.ack()) };
    mocks.admin.mockReturnValue({
      rpc: mocks.rpc,
      storage: { from: () => ({ remove: mocks.remove }) },
      from: () => ({ delete: () => deletion }),
    });
    mocks.rpc.mockResolvedValueOnce({ data: { locked: false, counts: { study_logs: 2 } }, error: null })
      .mockResolvedValueOnce({ data: [{ storage_path: "private/path.png", claim_id: "lease" }], error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.ack.mockReturnValue({ error: null });
  });
  it("rejects unauthenticated calls before touching the database", async () => {
    expect((await GET(new Request("https://app.test/api/cron/retention"))).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("rejects a missing configured secret even for Bearer undefined", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request())).status).toBe(401);
  });
  it("rejects an incorrect same-length secret", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secreX");
    expect((await GET(request())).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("reports missing admin configuration honestly", async () => {
    mocks.admin.mockReturnValue(null);
    expect((await GET(request())).status).toBe(503);
  });
  it("purges database records then removes queued Storage files without exposing paths", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "purge_expired_records", { p_dry_run: false });
    expect(mocks.remove).toHaveBeenCalledWith(["private/path.png"]);
    expect(await response.json()).toEqual({ counts: { study_logs: 2 }, filesDeleted: 1, filesFailed: 0 });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("leaves failed Storage deletions queued for retry", async () => {
    mocks.remove.mockResolvedValue({ error: { message: "private-file-name" } });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ counts: { study_logs: 2 }, filesDeleted: 0, filesFailed: 1 });
    expect(mocks.ack).not.toHaveBeenCalled();
  });
  it("keeps a successful file removal queued if acknowledgement fails", async () => {
    mocks.ack.mockReturnValue({ error: {} });
    expect((await GET(request())).status).toBe(503);
  });
  it("continues cleaning other files after one file fails", async () => {
    mocks.rpc.mockReset()
      .mockResolvedValueOnce({ data: { locked: false, counts: {} }, error: null })
      .mockResolvedValueOnce({ data: [
        { storage_path: "failed.png", claim_id: "first" },
        { storage_path: "success.png", claim_id: "second" },
      ], error: null });
    mocks.remove.mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({ error: null });
    const response = await GET(request());
    expect(await response.json()).toEqual({ counts: {}, filesDeleted: 1, filesFailed: 1 });
    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect(mocks.ack).toHaveBeenCalledTimes(1);
  });
  it("skips overlapping database runs", async () => {
    mocks.rpc.mockReset().mockResolvedValue({ data: { locked: true }, error: null });
    expect(await (await GET(request())).json()).toEqual({ skipped: true, reason: "already_running" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("hides provider errors and tokens", async () => {
    mocks.rpc.mockReset().mockResolvedValue({ data: null, error: { message: "secret" } });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "retention_failed" });
  });
});
