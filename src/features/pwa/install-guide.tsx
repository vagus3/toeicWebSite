"use client";

import { DotsThreeVertical, DownloadSimple, Export, PlusSquare, X, type Icon } from "@phosphor-icons/react";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { useToast } from "@/stores/toast-store";
import type { InstallPlatform } from "./install-detect";
import { dismissInstallGuide, promptInstall, useInstallGuide } from "./install-state";

interface Step {
  text: string;
  icon?: Icon;
}

const OPEN_STEP: Step = { text: "홈 화면의 새벽 토익 아이콘으로 열어요" };

const STEPS: Record<Exclude<InstallPlatform, "other">, Step[]> = {
  ios: [{ icon: Export, text: "Safari 하단의 공유 버튼을 눌러요" }, { icon: PlusSquare, text: "‘홈 화면에 추가’를 선택해요" }, OPEN_STEP],
  android: [{ icon: DotsThreeVertical, text: "Chrome 오른쪽 위 메뉴를 눌러요" }, { icon: DownloadSimple, text: "‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해요" }, OPEN_STEP],
};

const DESCRIPTION = "앱처럼 바로 열고, 채팅·콕 찌르기 알림도 받을 수 있어요";

/**
 * 모바일 홈 화면 설치 안내
 * - iOS: Safari에는 설치 버튼 API가 없어서 공유 → 홈 화면에 추가 순서를 안내 (16.4+ 홈 화면 앱에서만 푸시 가능)
 * - Android: Chrome이 설치 프롬프트를 주면 [앱 설치] 버튼으로 바로 설치, 아니면 메뉴 경로 안내
 */
export function InstallGuide() {
  const { platform, canPrompt } = useInstallGuide();
  const flash = useToast((s) => s.flash);
  if (!platform || platform === "other") return null;

  const install = async () => {
    if (!(await promptInstall())) return;
    dismissInstallGuide();
    flash("홈 화면에 새벽 토익을 설치했어요");
  };

  return (
    <aside role="dialog" aria-labelledby="install-guide-title" className="card elev-lg fixed inset-x-4 bottom-tabbar z-50 gap-3 p-4 md:hidden">
      <div className="flex items-start gap-3">
        <BrandMark size="sm" />
        <div className="flex flex-1 flex-col gap-0.5">
          <h2 id="install-guide-title" className="m-0 text-body leading-normal font-medium tracking-normal">
            {platform === "android" ? "새벽 토익 앱을 설치하세요" : "새벽 토익을 홈 화면에 추가하세요"}
          </h2>
          <p className="m-0 text-label text-muted">{DESCRIPTION}</p>
        </div>
        <Button size="icon" className="size-7" onClick={dismissInstallGuide} aria-label="설치 안내 닫기">
          <X />
        </Button>
      </div>

      {platform === "android" && canPrompt ? (
        <Button variant="primary" className="h-control-lg w-full text-body" onClick={install}>
          <DownloadSimple className="text-icon" />앱 설치
        </Button>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {STEPS[platform].map(({ icon: StepIcon, text }, i) => (
            <li key={text} className="flex items-center gap-2.5 text-meta">
              <span className="grid size-5 flex-none place-items-center rounded-full bg-accent-900 text-caption text-accent-200">{i + 1}</span>
              <span className="flex-1">{text}</span>
              {StepIcon && <StepIcon className="text-icon text-accent" aria-hidden />}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
