import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyFrom(base64: string) {
  const key = Buffer.from(base64, "base64");
  if (key.length !== 32) throw new Error("invalid_drive_encryption_key");
  return key;
}

/** 사용자 ID를 인증 데이터에 포함해 다른 사용자의 암호문을 재사용할 수 없게 한다. */
export function encryptDriveToken(token: string, ownerId: string, key: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(key), iv);
  cipher.setAAD(Buffer.from(ownerId));
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptDriveToken(value: string, ownerId: string, key: string) {
  const [version, iv, tag, encrypted, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted || extra)
    throw new Error("invalid_drive_token");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFrom(key),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(Buffer.from(ownerId));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
