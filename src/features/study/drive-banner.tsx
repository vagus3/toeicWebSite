"use client";

import { GoogleDriveLogo } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isFullscreenPath } from "@/features/shell/fullscreen";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { useDriveStatus } from "./drive-controls";

/**
 * 내 Drive가 연결되지 않았을 때만 보이는 한 줄 안내. 연결과 폴더 설정은 내 메뉴(/me)에서 한다.
 * 기본은 레이아웃 맨 위에 붙고, /me와 전체 화면 경로에서는 숨는다.
 * inline: 촬영·해커스 화면 안에서 쓰는 변형으로, 경로와 상관없이 보인다.
 */
export function DriveBanner({ inline = false }: { inline?: boolean }) {
  const pathname = usePathname();
  const mode = useStudyStore((s) => s.mode);
  const status = useDriveStatus();
  if (mode !== "live" || !status.data?.configured || status.data.connected)
    return null;
  if (!inline && (pathname === ROUTES.me || isFullscreenPath(pathname)))
    return null;

  return (
    <p
      role="status"
      className={cn(
        "m-0 flex items-center gap-2.5 text-meta",
        !inline && "card elev-sm flex-row px-3.5 py-3",
      )}
    >
      <GoogleDriveLogo className="shrink-0 text-icon text-accent" />
      <span className="min-w-0 flex-1">
        인증 사진을 저장하려면 내 Google Drive를 연결해 주세요
      </span>
      <Link href={ROUTES.me} className="shrink-0 text-accent underline">
        연결하기
      </Link>
    </p>
  );
}
