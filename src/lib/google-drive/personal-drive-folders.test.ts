import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

const m = vi.hoisted(() => ({
  connection: vi.fn(),
  partyName: vi.fn(),
  update: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: table === "parties" ? m.partyName : m.connection,
        }),
      }),
      update: (values: unknown) => ({ eq: () => m.update(values) }),
    }),
  }),
}));
vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials() {}
        getAccessToken = async () => ({ token: "short-lived" });
      },
    },
    drive: () => ({ files: { get: m.get, list: m.list, create: m.create } }),
  },
}));
import { encryptDriveToken } from "./token-crypto";
import {
  DEFAULT_FOLDER_NAME,
  pickerConfig,
  setPersonalDriveFolder,
  uploadPersonalEvidence,
} from "./personal-drive";

const FOLDER = "application/vnd.google-apps.folder";
const key = randomBytes(32).toString("base64");
const upload = () =>
  uploadPersonalEvidence({
    ownerId: "owner",
    partyId: "party-1",
    studyDate: "2026-10-12",
    fileName: "word.jpeg",
    mimeType: "image/jpeg",
    data: Buffer.from("photo"),
  });
const createdNames = () => m.create.mock.calls.map((c) => c[0].requestBody.name);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GOOGLE_CLIENT_ID", "123456789012-abc.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  vi.stubEnv("SUPABASE_SECRET_KEY", "server-key");
  vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", key);
  m.connection.mockResolvedValue({
    data: {
      encrypted_refresh_token: encryptDriveToken("refresh", "owner", key),
      folder_id: "root-folder",
      revoked_at: null,
    },
    error: null,
  });
  m.partyName.mockResolvedValue({ data: { name: "새벽 900" }, error: null });
  m.update.mockResolvedValue({ error: null });
  m.get.mockResolvedValue({
    data: { mimeType: FOLDER, trashed: false, capabilities: { canAddChildren: true } },
  });
  m.list.mockResolvedValue({ data: { files: [] } });
  let n = 0;
  m.create.mockImplementation(async () => ({ data: { id: `new-${++n}` } }));
});

describe("Drive 저장 폴더 정리", () => {
  it("저장 폴더 아래 파티 이름/연-월 폴더를 만들고 그 안에 저장한다", async () => {
    await upload();
    expect(createdNames()).toEqual(["새벽 900", "2026-10", "2026-10-12-word.jpeg"]);
    expect(m.create.mock.calls[0][0].requestBody.parents).toEqual(["root-folder"]);
    expect(m.create.mock.calls[1][0].requestBody.parents).toEqual(["new-1"]);
    expect(m.create.mock.calls[2][0].requestBody.parents).toEqual(["new-2"]);
  });
  it("이미 있는 하위 폴더는 다시 만들지 않는다", async () => {
    m.list
      .mockResolvedValueOnce({ data: { files: [{ id: "party-folder" }] } })
      .mockResolvedValueOnce({ data: { files: [{ id: "month-folder" }] } });
    await upload();
    expect(createdNames()).toEqual(["2026-10-12-word.jpeg"]);
    expect(m.create.mock.calls[0][0].requestBody.parents).toEqual(["month-folder"]);
  });
  it("파티 이름의 따옴표가 검색어를 깨뜨리지 않도록 이스케이프한다", async () => {
    m.partyName.mockResolvedValue({ data: { name: "it's 900" }, error: null });
    await upload();
    expect(m.list.mock.calls[0][0].q).toContain("name = 'it\\'s 900'");
  });
  it("저장 폴더가 휴지통에 있으면 기본 폴더를 새로 만들어 저장 위치를 바꾼다", async () => {
    m.get.mockResolvedValue({ data: { mimeType: FOLDER, trashed: true } });
    await upload();
    expect(createdNames()[0]).toBe(DEFAULT_FOLDER_NAME);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ folder_id: "new-1" }));
    expect(m.create.mock.calls[1][0].requestBody.parents).toEqual(["new-1"]);
  });
});

describe("Picker로 고른 폴더 지정", () => {
  it("쓸 수 있는 폴더만 저장 위치로 바꾼다", async () => {
    await setPersonalDriveFolder("owner", "picked-folder-id");
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ folder_id: "picked-folder-id" }));
  });
  it.each([
    ["파일", { mimeType: "image/png", trashed: false }],
    ["휴지통 폴더", { mimeType: FOLDER, trashed: true }],
    ["읽기 전용 공유 폴더", { mimeType: FOLDER, trashed: false, capabilities: { canAddChildren: false } }],
  ])("%s는 거절한다", async (_label, data) => {
    m.get.mockResolvedValue({ data });
    await expect(setPersonalDriveFolder("owner", "picked-folder-id")).rejects.toThrow("drive_folder_invalid");
    expect(m.update).not.toHaveBeenCalled();
  });
  it("접근 권한이 없거나 형식이 이상한 ID는 거절한다", async () => {
    m.get.mockRejectedValue(Object.assign(new Error("not found"), { code: 404 }));
    await expect(setPersonalDriveFolder("owner", "picked-folder-id")).rejects.toThrow("drive_folder_invalid");
    await expect(setPersonalDriveFolder("owner", "' or 1=1")).rejects.toThrow("drive_folder_invalid");
    expect(m.update).not.toHaveBeenCalled();
  });
  it("Client ID의 프로젝트 번호와 API 키가 모두 있어야 Picker를 켠다", () => {
    expect(pickerConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_PICKER_API_KEY", "browser-key");
    expect(pickerConfig()).toEqual({ apiKey: "browser-key", appId: "123456789012" });
  });
});
