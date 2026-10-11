import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  readPersonal: vi.fn(),
  readThumb: vi.fn(),
  readLegacy: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  requireSession: mocks.requireSession,
  apiError: (status: number, error: string) =>
    Response.json({ error }, { status }),
}));
vi.mock("@/lib/google-drive/personal-drive", () => ({
  readPersonalEvidence: mocks.readPersonal,
  readPersonalThumbnail: mocks.readThumb,
}));
vi.mock("@/lib/google-drive/drive", () => ({ readEvidence: mocks.readLegacy }));
import { GET } from "./route";

describe("private Drive photo delivery", () => {
  const logId = "11111111-1111-4111-8111-111111111111";
  const request = new Request(`https://app.test/api/study/evidence/${logId}`);
  const params = { params: Promise.resolve({ logId }) };
  beforeEach(() => {
    vi.resetAllMocks();
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: mocks.maybeSingle,
    };
    mocks.requireSession.mockResolvedValue({
      ok: true,
      data: {
        user: { id: "viewing-party-member" },
        supabase: { from: () => query },
      },
    });
  });
  it("uses the uploader's Drive and streams the photo without redirecting the viewer", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        drive_owner_id: "photo-owner",
        drive_file_id: "private-file",
        mime_type: "image/png",
        storage_path: null,
      },
      error: null,
    });
    mocks.readPersonal.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const response = await GET(request, params);
    expect(mocks.readPersonal).toHaveBeenCalledWith(
      "photo-owner",
      "private-file",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });
  it("does not access Drive if the file is hidden by the viewer's RLS", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await GET(request, params)).status).toBe(404);
    expect(mocks.readPersonal).not.toHaveBeenCalled();
    expect(mocks.readLegacy).not.toHaveBeenCalled();
  });
  it("does not query file data for unauthenticated requests", async () => {
    mocks.requireSession.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
    });
    expect((await GET(request, params)).status).toBe(401);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
  it("returns a generic error when the owner's Drive authorization is unavailable", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        drive_owner_id: "owner",
        drive_file_id: "file",
        mime_type: "image/png",
      },
      error: null,
    });
    mocks.readPersonal.mockRejectedValue(new Error("private-provider-token"));
    const response = await GET(request, params);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "photo_unavailable" });
  });
});

describe("목록용 썸네일", () => {
  const logId = "11111111-1111-4111-8111-111111111111";
  const thumbRequest = new Request(`https://app.test/api/study/evidence/${logId}?size=thumb`);
  const params = { params: Promise.resolve({ logId }) };
  const personal = { drive_owner_id: "owner", drive_file_id: "file", mime_type: "image/jpeg", storage_path: null };
  beforeEach(() => {
    vi.resetAllMocks();
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: mocks.maybeSingle };
    mocks.requireSession.mockResolvedValue({ ok: true, data: { user: { id: "viewer" }, supabase: { from: () => query } } });
    mocks.maybeSingle.mockResolvedValue({ data: personal, error: null });
    mocks.readPersonal.mockResolvedValue(new Uint8Array([9, 9]).buffer);
  });
  it("썸네일이 있으면 원본을 받지 않고 작은 이미지를 캐시와 함께 보낸다", async () => {
    mocks.readThumb.mockResolvedValue({ body: new Uint8Array([1]).buffer, mimeType: "image/png" });
    const response = await GET(thumbRequest, params);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(mocks.readPersonal).not.toHaveBeenCalled();
  });
  it.each([
    ["아직 썸네일이 없을 때", () => mocks.readThumb.mockResolvedValue(null)],
    ["썸네일을 받지 못할 때", () => mocks.readThumb.mockRejectedValue(new Error("thumb failed"))],
  ])("%s 원본으로 대체한다", async (_label, setup) => {
    setup();
    const response = await GET(thumbRequest, params);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([9, 9]));
  });
  it("이전 운영자 Drive 사진은 썸네일 없이 원본을 보낸다", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { ...personal, drive_owner_id: null }, error: null });
    mocks.readLegacy.mockResolvedValue(new Uint8Array([7]).buffer);
    expect((await GET(thumbRequest, params)).status).toBe(200);
    expect(mocks.readThumb).not.toHaveBeenCalled();
    expect(mocks.readLegacy).toHaveBeenCalledWith("file");
  });
});
