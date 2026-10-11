import "server-only";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { decryptDriveToken, encryptDriveToken } from "./token-crypto";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DEFAULT_FOLDER_NAME = "새벽 토익 인증";
const FOLDER_MIME = "application/vnd.google-apps.folder";
type DriveApi = ReturnType<typeof google.drive>;
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
  return { api: google.drive({ version: "v3", auth }), auth, connection };
}

function driveErrorCode(error: unknown) {
  return Number((error as { code?: number }).code);
}

/** Drive 검색어 문자열 안의 따옴표·역슬래시를 이스케이프한다 */
function quoteDrive(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/** 폴더가 남아 있고 쓸 수 있는지. 지워졌거나 권한이 없으면 false */
async function isUsableFolder(api: DriveApi, folderId: string | null) {
  if (!folderId) return false;
  try {
    const { data } = await api.files.get({
      fileId: folderId,
      fields: "id,mimeType,trashed,capabilities(canAddChildren)",
    });
    return (
      data.mimeType === FOLDER_MIME &&
      !data.trashed &&
      data.capabilities?.canAddChildren !== false
    );
  } catch (error) {
    if ([403, 404].includes(driveErrorCode(error))) return false;
    throw error;
  }
}

async function createFolder(api: DriveApi, name: string, parent?: string) {
  const id = (
    await api.files.create({
      requestBody: {
        name,
        mimeType: FOLDER_MIME,
        ...(parent ? { parents: [parent] } : {}),
      },
      fields: "id",
    })
  ).data.id;
  if (!id) throw new Error("drive_folder_create_failed");
  return id;
}

/** drive.file 권한이라 앱이 만든 하위 폴더만 검색된다. 없으면 만든다. */
async function childFolder(api: DriveApi, parent: string, name: string) {
  const { data } = await api.files.list({
    q: `${quoteDrive(parent)} in parents and name = ${quoteDrive(name)} and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
    spaces: "drive",
  });
  return data.files?.[0]?.id ?? createFolder(api, name, parent);
}

async function saveRootFolder(ownerId: string, folderId: string) {
  const { error } = await adminClient()
    .from("drive_connections")
    .update({ folder_id: folderId, updated_at: new Date().toISOString() })
    .eq("owner_id", ownerId);
  if (error) throw new Error("drive_connection_save_failed");
}

/** 사용자가 루트 폴더를 휴지통에 버렸으면 기본 폴더를 새로 만들어 이어서 저장한다 */
async function ensureRootFolder(
  api: DriveApi,
  ownerId: string,
  folderId: string | null,
) {
  if (await isUsableFolder(api, folderId)) return folderId!;
  const created = await createFolder(api, DEFAULT_FOLDER_NAME);
  await saveRootFolder(ownerId, created);
  return created;
}

async function partyFolderName(partyId: string) {
  const { data } = await adminClient()
    .from("parties")
    .select("name")
    .eq("id", partyId)
    .maybeSingle();
  return data?.name?.trim() || "파티";
}

/** Picker 설정. API 키가 없거나 Client ID에서 프로젝트 번호를 못 얻으면 null */
export function pickerConfig() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
  // 웹 OAuth Client ID의 앞 숫자가 Picker의 App ID(프로젝트 번호)다
  const appId = process.env.GOOGLE_CLIENT_ID?.match(/^(\d+)-/)?.[1];
  return apiKey && appId ? { apiKey, appId } : null;
}

/**
 * 브라우저 Picker용 단기 액세스 토큰. drive.file 범위라 앱이 만든 파일과
 * 사용자가 Picker에서 고른 항목에만 접근할 수 있다.
 */
export async function pickerAccessToken(ownerId: string) {
  const { auth } = await personalDrive(ownerId);
  const { token } = await auth.getAccessToken();
  if (!token) throw new DriveConnectionError();
  return token;
}

export class DriveFolderError extends Error {
  constructor() {
    super("drive_folder_invalid");
  }
}

/** Picker에서 고른 폴더를 저장 위치로 지정한다. 쓸 수 있는 폴더인지 서버에서 다시 확인한다. */
export async function setPersonalDriveFolder(ownerId: string, folderId: string) {
  if (!/^[\w-]{10,200}$/.test(folderId)) throw new DriveFolderError();
  const { api } = await personalDrive(ownerId);
  if (!(await isUsableFolder(api, folderId))) throw new DriveFolderError();
  await saveRootFolder(ownerId, folderId);
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
  // 재연결 시 사용자가 지정했거나 옮긴 폴더를 그대로 쓴다
  const folderId = (await isUsableFolder(drive, existing?.folder_id ?? null))
    ? existing!.folder_id
    : await createFolder(drive, DEFAULT_FOLDER_NAME);
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
  // 저장 위치/파티 이름/연-월 폴더로 정리한다. 루트는 ID로 추적하므로 옮기거나 이름을 바꿔도 된다.
  const root = await ensureRootFolder(api, params.ownerId, connection.folder_id);
  const party = await childFolder(api, root, await partyFolderName(params.partyId));
  const month = await childFolder(api, party, params.studyDate.slice(0, 7));
  const file = await api.files.create({
    requestBody: {
      name: `${params.studyDate}-${params.fileName}`,
      parents: [month],
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
