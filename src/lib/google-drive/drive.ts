import "server-only";

import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";

/**
 * 운영자 Drive 한 곳에 모든 인증 사진을 모은다 (설계안 1안).
 * 운영자가 한 번 OAuth로 연결해 받은 refresh token을 서버 환경변수(또는 drive_connections)에 보관한다.
 * 권한은 drive.file — 앱이 만든 파일/폴더만 접근.
 *
 * TOEIC-STUDY/<party>/<user>/<YYYY-MM-DD>/<file>
 */
export function isDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN &&
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  );
}

function getDrive() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
  return google.drive({ version: "v3", auth });
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

async function ensureFolder(drive: drive_v3.Drive, parentId: string, name: string) {
  const escaped = name.replace(/'/g, "\\'");
  const found = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  const existing = found.data.files?.[0]?.id;
  if (existing) return existing;
  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id",
  });
  return created.data.id!;
}

export async function uploadEvidence(params: {
  partyId: string;
  userFolder: string;
  studyDate: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
}) {
  const drive = getDrive();
  let parent = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
  for (const segment of [params.partyId, params.userFolder, params.studyDate]) {
    parent = await ensureFolder(drive, parent, segment);
  }
  const file = await drive.files.create({
    requestBody: { name: params.fileName, parents: [parent] },
    media: { mimeType: params.mimeType, body: Readable.from(params.data) },
    fields: "id, mimeType",
  });
  return { fileId: file.data.id!, mimeType: file.data.mimeType ?? params.mimeType };
}
