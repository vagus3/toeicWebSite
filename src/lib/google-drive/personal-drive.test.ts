import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  verifyIdToken: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
  folderGet: vi.fn(),
  folderCreate: vi.fn(),
  setCredentials: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      upsert: mocks.upsert,
    }),
  }),
}));
vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        getToken = mocks.getToken;
        verifyIdToken = mocks.verifyIdToken;
        setCredentials = mocks.setCredentials;
      },
    },
    drive: () => ({
      files: { get: mocks.folderGet, create: mocks.folderCreate },
    }),
  },
}));
import { connectPersonalDrive, DRIVE_SCOPE } from "./personal-drive";
import { decryptDriveToken } from "./token-crypto";

describe("personal Drive authorization persistence", () => {
  const key = randomBytes(32).toString("base64");
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("GOOGLE_CLIENT_ID", "web-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-key");
    vi.stubEnv("DRIVE_TOKEN_ENCRYPTION_KEY", key);
    mocks.getToken.mockResolvedValue({
      tokens: {
        id_token: "signed-token",
        refresh_token: "private-refresh",
        scope: `openid email ${DRIVE_SCOPE}`,
      },
    });
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-account-a",
        email: "owner@example.com",
        email_verified: true,
      }),
    });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.folderCreate.mockResolvedValue({ data: { id: "private-folder" } });
    mocks.upsert.mockResolvedValue({ error: null });
  });
  it("persists an encrypted owner-bound token and creates a private folder", async () => {
    await connectPersonalDrive(
      "app-user",
      "authorization-code",
      "https://app.test/auth/drive/callback",
    );
    expect(mocks.verifyIdToken).toHaveBeenCalledWith({
      idToken: "signed-token",
      audience: "web-client",
    });
    const saved = mocks.upsert.mock.calls[0][0];
    expect(saved.owner_id).toBe("app-user");
    expect(saved.google_subject).toBe("google-account-a");
    expect(saved.folder_id).toBe("private-folder");
    expect(saved.encrypted_refresh_token).not.toBe("private-refresh");
    expect(
      decryptDriveToken(saved.encrypted_refresh_token, "app-user", key),
    ).toBe("private-refresh");
    expect(mocks.folderCreate.mock.calls[0][0].requestBody).not.toHaveProperty(
      "permissions",
    );
  });
  it("does not store a basic-login token without Drive permission", async () => {
    mocks.getToken.mockResolvedValue({
      tokens: {
        id_token: "signed-token",
        refresh_token: "refresh",
        scope: "openid email",
      },
    });
    await expect(
      connectPersonalDrive("app-user", "code", "https://app.test/callback"),
    ).rejects.toThrow("drive_permission_missing");
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.folderCreate).not.toHaveBeenCalled();
  });
  it("does not replace another Google account's connection or orphan old photos", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { google_subject: "google-account-b", folder_id: "old-folder" },
      error: null,
    });
    await expect(
      connectPersonalDrive("app-user", "code", "https://app.test/callback"),
    ).rejects.toThrow("drive_account_mismatch");
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.folderCreate).not.toHaveBeenCalled();
  });
  it("requires a new refresh token when reconnecting after disconnect", async () => {
    mocks.getToken.mockResolvedValue({
      tokens: { id_token: "signed-token", scope: DRIVE_SCOPE },
    });
    mocks.maybeSingle.mockResolvedValue({
      data: {
        google_subject: "google-account-a",
        revoked_at: "2026-10-11",
        encrypted_refresh_token: null,
      },
      error: null,
    });
    await expect(
      connectPersonalDrive("app-user", "code", "https://app.test/callback"),
    ).rejects.toThrow("drive_refresh_token_missing");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
