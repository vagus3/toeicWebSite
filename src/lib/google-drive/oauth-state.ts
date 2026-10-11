import { randomBytes, timingSafeEqual } from "node:crypto";

export const DRIVE_STATE_COOKIE = "drive-oauth-state";
export const DRIVE_STATE_TTL = 10 * 60 * 1000;

export function createDriveState(userId: string, now = Date.now()) {
  return { state: randomBytes(32).toString("hex"), userId, createdAt: now };
}

export function validDriveState(
  cookie: string | undefined,
  state: string | null,
  userId: string,
  now = Date.now(),
) {
  if (!cookie || !state || !/^[a-f0-9]{64}$/.test(state)) return false;
  try {
    const saved = JSON.parse(cookie);
    return (
      saved.userId === userId &&
      typeof saved.createdAt === "number" &&
      now >= saved.createdAt &&
      now - saved.createdAt < DRIVE_STATE_TTL &&
      typeof saved.state === "string" &&
      /^[a-f0-9]{64}$/.test(saved.state) &&
      timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))
    );
  } catch {
    return false;
  }
}
