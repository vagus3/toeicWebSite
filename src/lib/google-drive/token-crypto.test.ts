import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptDriveToken, encryptDriveToken } from "./token-crypto";

describe("Drive token encryption", () => {
  const key = randomBytes(32).toString("base64");
  it("keeps tokens encrypted at rest and binds them to the owner", () => {
    const encrypted = encryptDriveToken(
      "private-refresh-token",
      "owner-a",
      key,
    );
    expect(encrypted).not.toContain("private-refresh-token");
    expect(decryptDriveToken(encrypted, "owner-a", key)).toBe(
      "private-refresh-token",
    );
    expect(() => decryptDriveToken(encrypted, "owner-b", key)).toThrow();
    expect(encryptDriveToken("private-refresh-token", "owner-a", key)).not.toBe(
      encrypted,
    );
  });
  it("rejects tampering, a wrong key, and malformed values", () => {
    const encrypted = encryptDriveToken("token", "owner-a", key);
    const parts = encrypted.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptDriveToken(parts.join("."), "owner-a", key)).toThrow();
    expect(() =>
      decryptDriveToken(
        encrypted,
        "owner-a",
        randomBytes(32).toString("base64"),
      ),
    ).toThrow();
    expect(() => decryptDriveToken("not-a-token", "owner-a", key)).toThrow();
    expect(() =>
      encryptDriveToken("token", "owner-a", "invalid-key"),
    ).toThrow();
  });
});
