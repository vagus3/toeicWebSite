import { describe, expect, it } from "vitest";
import { driveConnectionFailure } from "./connection-error";

describe("Drive connection failure diagnostics", () => {
  it("distinguishes Google API activation from permission errors", () => {
    expect(driveConnectionFailure({ response: { data: { error: { details: [{ reason: "SERVICE_DISABLED" }] } } } })).toBe("api_disabled");
    expect(driveConnectionFailure({ response: { data: { error: { errors: [{ reason: "accessNotConfigured" }] } } } })).toBe("api_disabled");
    expect(driveConnectionFailure({ response: { data: { error: { errors: [{ reason: "insufficientPermissions" }] } } } })).toBe("permission_missing");
  });
  it("distinguishes client configuration, used codes and storage failures", () => {
    expect(driveConnectionFailure({ response: { data: { error: "invalid_client" } } })).toBe("client_invalid");
    expect(driveConnectionFailure({ response: { data: { error: "invalid_grant" } } })).toBe("code_expired");
    expect(driveConnectionFailure({ response: { data: { error: "redirect_uri_mismatch" } } })).toBe("redirect_mismatch");
    expect(driveConnectionFailure(new Error("drive_connection_save_failed"))).toBe("storage_failed");
    expect(driveConnectionFailure(new Error("drive_account_mismatch"))).toBe("account_mismatch");
  });
  it("never returns provider messages or secret-bearing objects", () => {
    expect(driveConnectionFailure(new Error("private-token in request body"))).toBe("failed");
    expect(driveConnectionFailure({ response: { data: { error: { message: "private-token", details: [{ reason: "unknown-secret" }] } } } })).toBe("failed");
    expect(driveConnectionFailure(null)).toBe("failed");
  });
});
