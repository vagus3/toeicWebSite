import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, limitRequest, requireSession } from "@/lib/api";
import {
  DriveConnectionError,
  DriveFolderError,
  isPersonalDriveConfigured,
  pickerAccessToken,
  pickerConfig,
  setPersonalDriveFolder,
} from "@/lib/google-drive/personal-drive";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** 폴더 선택 창(Picker)을 여는 데 필요한 단기 토큰과 설정 */
export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const config = pickerConfig();
  if (!isPersonalDriveConfigured() || !config)
    return apiError(503, "picker_not_configured");
  const limited = limitRequest(request, "drive-picker", session.data.user.id, 30, 3600000);
  if (limited) return limited;
  try {
    const accessToken = await pickerAccessToken(session.data.user.id);
    return NextResponse.json({ accessToken, ...config }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof DriveConnectionError)
      return apiError(409, "drive_connection_required");
    return apiError(503, "drive_unavailable");
  }
}

/** Picker에서 고른 폴더를 이후 업로드의 저장 위치로 지정한다 */
export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return apiError(403, "forbidden");
  const session = await requireSession();
  if (!session.ok) return session.response;
  if (!isPersonalDriveConfigured()) return apiError(503, "drive_not_configured");
  const limited = limitRequest(request, "drive-folder", session.data.user.id, 20, 3600000);
  if (limited) return limited;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, "invalid_request"); }
  const parsed = z.object({ folderId: z.string().min(1).max(200) }).safeParse(body);
  if (!parsed.success) return apiError(400, "invalid_request");
  try {
    await setPersonalDriveFolder(session.data.user.id, parsed.data.folderId);
    return NextResponse.json({ saved: true }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof DriveFolderError) return apiError(400, "drive_folder_invalid");
    if (error instanceof DriveConnectionError)
      return apiError(409, "drive_connection_required");
    return apiError(503, "drive_unavailable");
  }
}
