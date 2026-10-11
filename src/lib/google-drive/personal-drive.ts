import "server-only";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { decryptDriveToken, encryptDriveToken } from "./token-crypto";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export class DriveConnectionError extends Error {
  constructor() {
    super("drive_connection_required");
  }
}

export function isPersonalDriveConfigured() {
  const key = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.SUPABASE_SECRET_KEY &&
      key &&
      Buffer.from(key, "base64").length === 32,
  );
}

export function driveOAuthClient(redirectUri?: string) {
  if (!isPersonalDriveConfigured()) throw new Error("drive_not_configured");
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}

function adminClient() {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("drive_not_configured");
  return admin;
}

export async function getDriveConnection(ownerId: string) {
  const { data, error } = await adminClient()
    .from("drive_connections")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error("drive_connection_unavailable");
  return data;
}

/** 모든 호출자는 먼저 세션과 파일의 파티 접근 권한을 검증해야 한다. */
export async function personalDrive(ownerId: string) {
  const connection = await getDriveConnection(ownerId);
  if (!connection?.encrypted_refresh_token || connection.revoked_at)
    throw new DriveConnectionError();
  const auth = driveOAuthClient();
  auth.setCredentials({
    refresh_token: decryptDriveToken(
      connection.encrypted_refresh_token,
      ownerId,
      process.env.DRIVE_TOKEN_ENCRYPTION_KEY!,
    ),
  });
  return { api: google.drive({ version: "v3", auth }), connection };
}

/** 연결할 Google 계정은 토큰의 서명과 Client ID까지 확인한다. */
export async function connectPersonalDrive(
  ownerId: string,
  code: string,
  redirectUri: string,
) {
  const auth = driveOAuthClient(redirectUri);
  const { tokens } = await auth.getToken(code);
  if (!tokens.id_token || !tokens.scope?.split(" ").includes(DRIVE_SCOPE))
    throw new Error("drive_permission_missing");
  const ticket = await auth.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const account = ticket.getPayload();
  if (!account?.sub || !account.email || !account.email_verified)
    throw new Error("drive_account_invalid");
  const existing = await getDriveConnection(ownerId);
  // 다른 Google 계정으로 덮어쓰면 기존 사진을 읽을 수 없으므로 재연결은 같은 계정만 허용한다.
  if (existing?.google_subject && existing.google_subject !== account.sub)
    throw new Error("drive_account_mismatch");
  const refreshToken =
    tokens.refresh_token ??
    (existing?.encrypted_refresh_token && !existing.revoked_at
      ? decryptDriveToken(
          existing.encrypted_refresh_token,
          ownerId,
          process.env.DRIVE_TOKEN_ENCRYPTION_KEY!,
        )
      : null);
  if (!refreshToken) throw new Error("drive_refresh_token_missing");
  auth.setCredentials({ ...tokens, refresh_token: refreshToken });
  const drive = google.drive({ version: "v3", auth });
  let folderId: string | null = existing?.folder_id ?? null;
  if (folderId) {
    try {
      const folder = await drive.files.get({
        fileId: folderId,
        fields: "id,trashed",
      });
      if (folder.data.trashed) folderId = null;
    } catch (error) {
      if ([403, 404].includes(Number((error as { code?: number }).code)))
        folderId = null;
      else throw error;
    }
  }
  if (!folderId) {
    folderId = (
      await drive.files.create({
        requestBody: {
          name: "새벽 토익 인증",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      })
    ).data.id!;
  }
  const { error } = await adminClient()
    .from("drive_connections")
    .upsert({
      owner_id: ownerId,
      google_subject: account.sub,
      connected_email: account.email,
      encrypted_refresh_token: encryptDriveToken(
        refreshToken,
        ownerId,
        process.env.DRIVE_TOKEN_ENCRYPTION_KEY!,
      ),
      folder_id: folderId,
      revoked_at: null,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error("drive_connection_save_failed");
}

export async function disconnectPersonalDrive(ownerId: string) {
  const { error } = await adminClient()
    .from("drive_connections")
    .update({
      encrypted_refresh_token: null,
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", ownerId);
  if (error) throw new Error("drive_disconnect_failed");
}

export async function uploadPersonalEvidence(params: {
  ownerId: string;
  partyId: string;
  studyDate: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
}) {
  const { api, connection } = await personalDrive(params.ownerId);
  // 폴더는 연결 시 한 번 만들고, 파일에는 파티와 날짜를 표시한다.
  const file = await api.files.create({
    requestBody: {
      name: `${params.studyDate}-${params.partyId}-${params.fileName}`,
      parents: [connection.folder_id],
    },
    media: { mimeType: params.mimeType, body: Readable.from(params.data) },
    fields: "id",
  });
  if (!file.data.id) throw new Error("drive_upload_failed");
  return file.data.id;
}

export async function readPersonalEvidence(ownerId: string, fileId: string) {
  const { api } = await personalDrive(ownerId);
  return (
    await api.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" },
    )
  ).data as unknown as ArrayBuffer;
}

export async function removePersonalEvidence(ownerId: string, fileId: string) {
  const { api } = await personalDrive(ownerId);
  await api.files.delete({ fileId });
}
