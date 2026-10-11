import { describe, expect, it } from "vitest";
import {
  createDriveState,
  DRIVE_STATE_TTL,
  validDriveState,
} from "./oauth-state";

describe("Drive OAuth request binding", () => {
  it("accepts only the initiating session and matching state before expiration", () => {
    const state = createDriveState("user-a", 1000);
    const cookie = JSON.stringify(state);
    expect(validDriveState(cookie, state.state, "user-a", 2000)).toBe(true);
    expect(validDriveState(cookie, state.state, "user-b", 2000)).toBe(false);
    expect(
      validDriveState(cookie, createDriveState("user-a").state, "user-a", 2000),
    ).toBe(false);
    expect(
      validDriveState(cookie, state.state, "user-a", 1000 + DRIVE_STATE_TTL),
    ).toBe(false);
    expect(validDriveState(cookie, state.state, "user-a", 999)).toBe(false);
  });
  it("rejects missing or malformed cookies and state without throwing", () => {
    expect(validDriveState(undefined, null, "a")).toBe(false);
    expect(validDriveState("invalid-json", "a".repeat(64), "a")).toBe(false);
    expect(
      validDriveState('{"userId":"a","state":1}', "a".repeat(64), "a"),
    ).toBe(false);
    expect(validDriveState("{}", "short", "a")).toBe(false);
  });
});
