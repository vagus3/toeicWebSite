"use client";

import {
  DotsThreeVertical,
  DownloadSimple,
  Export,
  PlusSquare,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { isFullscreenPath } from "@/features/shell/fullscreen";
import { useToast } from "@/stores/toast-store";
import { InAppBrowserNotice, useUserAgent } from "./in-app-notice";
import {
  detectInAppBrowser,
  detectInstallBrowser,
  type InstallBrowser,
} from "./install-detect";
import { dismissInstallGuide, promptInstall, useInstallGuide } from "./install-state";

interface Step {
  text: string;
  icon?: Icon;
}

const OPEN_STEP: Step = { text: "홈 화면의 새벽 토익 아이콘으로 열어요" };

/** 브라우저마다 홈 화면에 추가하는 메뉴 위치가 다르다 */
const STEPS: Record<InstallBrowser, Step[]> = {
  "ios-safari": [
    { icon: Export, text: "Safari의 공유 버튼을 눌러요 (안 보이면 ⋯ 메뉴 안에 있어요)" },
    { icon: PlusSquare, text: "‘홈 화면에 추가’를 선택해요" },
    OPEN_STEP,
  ],
  "ios-other": [
    { icon: Export, text: "주소창 옆이나 메뉴의 공유 버튼을 눌러요" },
    { icon: PlusSquare, text: "‘홈 화면에 추가’를 선택해요 (iOS 16.4 이상)" },
    OPEN_STEP,
  ],
  "android-chrome": [
    { icon: DotsThreeVertical, text: "Chrome 오른쪽 위 메뉴(⋮)를 눌러요" },
    { icon: DownloadSimple, text: "‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해요" },
    OPEN_STEP,
  ],
  "android-other": [
    { icon: DotsThreeVertical, text: "브라우저 메뉴(≡ 또는 ⋮)를 눌러요" },
    { icon: DownloadSimple, text: "‘홈 화면에 추가’ 또는 ‘앱 설치’를 선택해요" },
    OPEN_STEP,
  ],
};

const DESCRIPTION = {
  ios: "앱처럼 바로 열 수 있어요. iPhone은 홈 화면에 추가한 앱에서만 채팅 알림을 받을 수 있어요",
  android: "앱처럼 바로 열고, 채팅 알림도 받을 수 있어요",
} as const;

/**
 * 모바일 홈 화면 설치 안내
 * - iOS: 설치 버튼 API가 없어서 공유 → 홈 화면에 추가 순서를 안내 (16.4+ 홈 화면 앱에서만 푸시 가능)
 * - Android: 브라우저가 설치 프롬프트를 주면 [앱 설치] 버튼으로 바로 설치(삼성 인터넷 포함), 아니면 메뉴 경로 안내
 * - 카카오톡 등 앱 안의 브라우저: 설치·알림이 안 되므로 기기 브라우저로 여는 방법을 안내
 */
export function InstallGuide() {
  const { platform, canPrompt } = useInstallGuide();
  const flash = useToast((s) => s.flash);
  const userAgent = useUserAgent();
  // 전체 화면(촬영·퀴즈·채팅 등)에서는 하단 고정 버튼·입력창을 가리지 않게 숨긴다
  const fullscreen = isFullscreenPath(usePathname());
  if (!platform || platform === "other" || fullscreen) return null;

  const inApp = detectInAppBrowser(userAgent);
  const browser =
    detectInstallBrowser(userAgent, navigator.maxTouchPoints) ??
    (platform === "ios" ? "ios-safari" : "android-chrome");

  const install = async () => {
    if (!(await promptInstall())) return;
    dismissInstallGuide();
    flash("홈 화면에 새벽 토익을 설치했어요");
  };

  const close = (
    <Button
      size="icon"
      className="size-7 shrink-0"
      onClick={dismissInstallGuide}
      aria-label="설치 안내 닫기"
    >
      <X />
    </Button>
  );

  return (
    <aside
      role="dialog"
      aria-labelledby={inApp ? undefined : "install-guide-title"}
      aria-label={inApp ? "다른 브라우저로 열기 안내" : undefined}
      className="card elev-lg fixed inset-x-4 bottom-tabbar z-50 gap-3 p-4 md:hidden"
    >
      {inApp ? (
        <div className="flex items-start gap-3">
          <InAppBrowserNotice reason="install" className="flex-1" />
          {close}
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <BrandMark size="sm" />
            <div className="flex flex-1 flex-col gap-0.5">
              <h2
                id="install-guide-title"
                className="m-0 text-body leading-normal font-medium tracking-normal"
              >
                {platform === "android"
                  ? "새벽 토익 앱을 설치하세요"
                  : "새벽 토익을 홈 화면에 추가하세요"}
              </h2>
              <p className="m-0 text-label text-muted">{DESCRIPTION[platform]}</p>
            </div>
            {close}
          </div>

          {platform === "android" && canPrompt ? (
            <Button variant="primary" className="h-control-lg w-full text-body" onClick={install}>
              <DownloadSimple className="text-icon" />앱 설치
            </Button>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {STEPS[browser].map(({ icon: StepIcon, text }, i) => (
                <li key={text} className="flex items-center gap-2.5 text-meta">
                  <span className="grid size-5 flex-none place-items-center rounded-full bg-accent-900 text-caption text-accent-200">
                    {i + 1}
                  </span>
                  <span className="flex-1">{text}</span>
                  {StepIcon && <StepIcon className="text-icon text-accent" aria-hidden />}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </aside>
  );
}
