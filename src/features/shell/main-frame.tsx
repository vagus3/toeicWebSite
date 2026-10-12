"use client";

import { usePathname } from "next/navigation";
import { isFullscreenPath } from "./fullscreen";

/**
 * 본문 래퍼. 전체 화면 경로는 위아래 여백을 0으로 두고, 안전 영역은 화면의
 * ScreenHeader(pt-safe)와 PinnedFooter(pb-safe)가 맡는다. 여기서도 주면 iPhone에서 두 번 들어간다.
 * 두 클래스 묶음을 조건으로 고른다. cn()으로 합치면 pt-4와 pt-0이 함께 남을 수 있다.
 */
export function MainFrame({ children }: { children: React.ReactNode }) {
  const fullscreen = isFullscreenPath(usePathname());
  return (
    <main
      className={
        fullscreen
          ? "flex min-w-0 flex-1 flex-col gap-4.5 px-5 md:gap-8 md:px-page-x md:pt-8 md:pb-16 md:glow-main"
          : "flex min-w-0 flex-1 flex-col gap-4.5 px-5 pt-4 pb-tabbar md:gap-8 md:px-page-x md:pt-8 md:pb-16 md:glow-main"
      }
    >
      {children}
    </main>
  );
}
