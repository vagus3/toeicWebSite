"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import {
  detectInAppBrowser,
  detectInstallPlatform,
  externalOpenUrl,
  IN_APP_NAME,
} from "./install-detect";

const noopSubscribe = () => () => {};

/** 서버 렌더링에서는 비어 있고, 브라우저에서만 user agent를 읽는다 */
export function useUserAgent() {
  return useSyncExternalStore(
    noopSubscribe,
    () => navigator.userAgent,
    () => "",
  );
}

/**
 * 카카오톡 같은 앱 안의 브라우저로 열었을 때 기기 브라우저로 옮기도록 안내한다.
 * login: Google 로그인이 앱 안에서 막힐 수 있다는 말을 덧붙인다 (로그인·가입·초대 화면).
 * install: 홈 화면 설치·알림이 안 된다는 안내 (설치 안내 카드 안).
 */
export function InAppBrowserNotice({
  reason,
  className,
}: {
  reason: "login" | "install";
  className?: string;
}) {
  const userAgent = useUserAgent();
  const flash = useToast((s) => s.flash);
  const inApp = userAgent ? detectInAppBrowser(userAgent) : null;
  if (!inApp) return null;

  const platform = detectInstallPlatform(userAgent, navigator.maxTouchPoints);
  const name = IN_APP_NAME[inApp];
  const browser = platform === "ios" ? "Safari" : "Chrome";
  // 크롬은 받침이 있어 '으로', 사파리는 '로'
  const toBrowser = platform === "ios" ? "Safari로" : "Chrome으로";
  const menu = platform === "ios" ? "공유 버튼" : "오른쪽 위 메뉴(⋮)";
  const openUrl = externalOpenUrl(inApp, platform, window.location.href);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash(`주소를 복사했어요. ${browser}에 붙여 넣어 열어 주세요`);
    } catch {
      flash("주소를 복사하지 못했어요. 메뉴의 '다른 브라우저로 열기'를 이용해 주세요");
    }
  };

  return (
    <aside role="note" aria-label="다른 브라우저로 열기 안내" className={cn("flex flex-col gap-2.5 text-meta", className)}>
      <strong className="text-body font-medium">{name} 안에서 열었어요</strong>
      <p className="m-0 text-muted">
        {reason === "login"
          ? `Google 로그인은 앱 안 브라우저에서 막힐 수 있어요. 가입·로그인과 앱 설치·알림은 ${browser}에서 열어 주세요.`
          : `${name} 안에서는 홈 화면에 앱을 추가하거나 알림을 받을 수 없어요. ${browser}에서 열어 주세요.`}
      </p>
      <div className="flex flex-wrap gap-2">
        {openUrl && (
          <Button asChild variant="primary">
            {/* 앱 주소(scheme)는 사용자가 눌러야 열린다 */}
            <a href={openUrl}>{toBrowser} 열기</a>
          </Button>
        )}
        <Button variant="secondary" onClick={copy}>
          주소 복사
        </Button>
      </div>
      <p className="m-0 text-label text-muted">
        안 열리면 {name}의 {menu}에서 &lsquo;다른 브라우저로 열기&rsquo;를 눌러 주세요.
      </p>
    </aside>
  );
}
