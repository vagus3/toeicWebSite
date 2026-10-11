import "server-only";

import { google } from "googleapis";

/** 개인 Drive 전환 전 운영자 Drive에 저장한 사진의 조회 호환용. 신규 저장은 personal-drive.ts가 맡는다. */
export async function readEvidence(fileId: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  });
  const drive = google.drive({ version: "v3", auth });
  const result = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );
  return result.data as unknown as ArrayBuffer;
}
