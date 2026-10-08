"use client";

import { useSyncExternalStore } from "react";
import { installGuidePlatform, type InstallPlatform } from "./install-detect";

/** Chrome(Android)의 설치 프롬프트 이벤트 — 표준 타입이 아직 없어 필요한 부분만 정의 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "toeic-install-guide-dismissed";
const STANDALONE_QUERY = "(display-mode: standalone)";
const CHANGE_EVENT = "toeic-install-state";

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// 이벤트가 컴포넌트 마운트 전에 올 수 있어 모듈 로드 시점에 붙잡아 둔다
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(STANDALONE_QUERY);
  const events = ["resize", "storage", CHANGE_EVENT, "appinstalled"];
  mql.addEventListener("change", onChange);
  events.forEach((name) => window.addEventListener(name, onChange));
  return () => {
    mql.removeEventListener("change", onChange);
    events.forEach((name) => window.removeEventListener(name, onChange));
  };
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getPlatform(): InstallPlatform | null {
  return installGuidePlatform({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: isStandalone(),
    dismissed: readDismissed(),
  });
}

export function dismissInstallGuide() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 닫힌다
  }
  notify();
}

/** Chrome 설치 프롬프트 띄우기 — 수락하면 true */
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === "accepted";
}

/** 지금 보여줄 설치 안내 플랫폼과, 바로 설치 버튼을 쓸 수 있는지 */
export function useInstallGuide() {
  const platform = useSyncExternalStore(subscribe, getPlatform, () => null);
  const canPrompt = useSyncExternalStore(
    subscribe,
    () => deferredPrompt !== null,
    () => false,
  );
  return { platform, canPrompt };
}
