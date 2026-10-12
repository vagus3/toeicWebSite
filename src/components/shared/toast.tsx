"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { isFullscreenPath } from "@/features/shell/fullscreen";
import { cn } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

export function Toast() {
  const message = useToast((s) => s.message);
  // 탭바가 있는 화면은 탭바 위, 전체 화면은 하단 고정 영역을 가리지 않게 헤더 아래에 띄운다
  const fullscreen = isFullscreenPath(usePathname());
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-5 z-60 flex items-center gap-2 rounded-md bg-surface px-3.5 py-3 text-meta shadow-lg md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:px-4",
        fullscreen ? "top-toast-safe" : "bottom-toast-mobile",
      )}
    >
      <CheckCircle className="shrink-0 text-icon-sm text-accent" />
      {message}
    </div>
  );
}
