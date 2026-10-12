"use client";

import { usePathname } from "next/navigation";
import { isFullscreenPath } from "./fullscreen";

/**
 * 본문 래퍼. 전체 화면 경로는 탭바 여백(pb-tabbar)을 빼고 상단 안전 영역(pt-safe)을 남긴다.
 * 두 클래스 묶음을 조건으로 고른다. cn()으로 합치면 pt-4와 pt-safe가 함께 남는다.
 */
export function MainFrame({ children }: { children: React.ReactNode }) {
  const fullscreen = isFullscreenPath(usePathname());
  return (
    <main
      className={
        fullscreen
          ? "flex min-w-0 flex-1 flex-col gap-4.5 px-5 pt-safe pb-safe md:gap-8 md:px-page-x md:pt-8 md:pb-16 md:glow-main"
          : "flex min-w-0 flex-1 flex-col gap-4.5 px-5 pt-4 pb-tabbar md:gap-8 md:px-page-x md:pt-8 md:pb-16 md:glow-main"
      }
    >
      {children}
    </main>
  );
}
