/** Return only allowlisted codes: Google errors can contain tokens and request bodies. */
export function driveConnectionFailure(error: unknown): string {
  const value = error as {
    message?: string;
    response?: { data?: { error?: string | {
      errors?: { reason?: string }[];
      details?: { reason?: string }[];
    } } };
  } | null;
  const known: Record<string, string> = {
    drive_account_mismatch: "account_mismatch",
    drive_permission_missing: "permission_missing",
    drive_refresh_token_missing: "refresh_token_missing",
    drive_connection_unavailable: "storage_failed",
    drive_connection_save_failed: "storage_failed",
    drive_not_configured: "not_configured",
  };
  if (value?.message && known[value.message]) return known[value.message];
  const provider = value?.response?.data?.error;
  const code = typeof provider === "string" ? provider : value?.message;
  if (code === "invalid_client") return "client_invalid";
  if (code === "invalid_grant") return "code_expired";
  if (code === "redirect_uri_mismatch") return "redirect_mismatch";
  if (provider && typeof provider === "object") {
    const reasons = [...(provider.errors ?? []), ...(provider.details ?? [])].map((e) => e.reason);
    if (reasons.includes("accessNotConfigured") || reasons.includes("SERVICE_DISABLED")) return "api_disabled";
    if (reasons.includes("insufficientPermissions") || reasons.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT")) return "permission_missing";
  }
  return "failed";
}
