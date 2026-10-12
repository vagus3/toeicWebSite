"use client";

import { useEffect, useRef } from "react";
import { isAndroidDevice } from "@/features/pwa/install-detect";

/** TypeScript DOM 타입에 아직 없는 CloseWatcher (Chrome 120+) */
interface CloseWatcherLike {
  onclose: (() => void) | null;
  destroy(): void;
}
type CloseWatcherConstructor = new () => CloseWatcherLike;

/**
 * Android 뒤로가기(제스처·버튼)로 열린 창을 닫는다.
 * CloseWatcher가 없으면 뒤로가기가 이전 화면으로 가 버려서, 시트를 닫으려다 화면을 벗어난다.
 * 데스크톱 Esc는 Radix가 이미 처리하므로 Android에서만 켠다(같은 Esc에 두 번 닫히지 않게).
 */
export function useCloseWatcher(active: boolean, onClose: () => void) {
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });

  useEffect(() => {
    const CloseWatcher = (globalThis as { CloseWatcher?: CloseWatcherConstructor }).CloseWatcher;
    if (!active || !CloseWatcher || !isAndroidDevice(navigator.userAgent)) return;
    const watcher = new CloseWatcher();
    watcher.onclose = () => latest.current();
    return () => watcher.destroy();
  }, [active]);
}
