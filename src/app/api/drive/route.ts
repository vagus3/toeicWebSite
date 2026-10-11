import { NextResponse } from "next/server";
import { apiError, requireSession } from "@/lib/api";
import {
  disconnectPersonalDrive,
  getDriveConnection,
  isPersonalDriveConfigured,
  pickerConfig,
} from "@/lib/google-drive/personal-drive";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  if (!isPersonalDriveConfigured())
    return NextResponse.json(
      { configured: false, connected: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  try {
    const connection = await getDriveConnection(session.data.user.id);
    const connected = Boolean(
      connection?.encrypted_refresh_token && !connection.revoked_at,
    );
    return NextResponse.json(
      {
        configured: true,
        connected,
        email: connection?.connected_email ?? null,
        pickerEnabled: connected && pickerConfig() !== null,
        folderUrl: connected
          ? `https://drive.google.com/drive/folders/${encodeURIComponent(connection!.folder_id)}`
          : null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return apiError(503, "drive_unavailable");
  }
}

export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return apiError(403, "forbidden");
  const session = await requireSession();
  if (!session.ok) return session.response;
  if (!isPersonalDriveConfigured())
    return apiError(503, "drive_not_configured");
  try {
    await disconnectPersonalDrive(session.data.user.id);
    return NextResponse.json({ disconnected: true });
  } catch {
    return apiError(503, "drive_unavailable");
  }
}
