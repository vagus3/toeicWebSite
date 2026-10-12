"use client";

import type { ReactNode } from "react";
import { useKeyboardInset } from "@/lib/hooks/use-keyboard-inset";
import { cn } from "@/lib/utils";

/**
 * 전체 화면의 하단 고정 영역 (입력창, 다음 버튼). pb-safe로 홈 바 위에 놓인다.
 * keyboardAware면 화면 키보드가 열렸을 때 키보드 높이만큼 올라간다 (채팅·질문 입력창).
 * 탭바가 있는 화면에서는 쓰지 않는다. 탭바가 이 영역을 가리기 때문이다.
 */
export function PinnedFooter({
  children,
  className,
  keyboardAware = false,
}: {
  children: ReactNode;
  className?: string;
  keyboardAware?: boolean;
}) {
  const inset = useKeyboardInset();
  const lift = keyboardAware ? inset : 0;
  return (
    <div
      className={cn(
        // rule-top은 배경 그라데이션으로 선을 그려서, 데스크톱에서는 bg-none으로 선까지 지운다
        "rule-top sticky bottom-0 z-30 -mx-5 mt-auto flex flex-col gap-2.5 bg-bg px-5 pt-3 pb-safe md:static md:mx-0 md:bg-transparent md:bg-none md:px-0 md:pt-0 md:pb-0",
        className,
      )}
      // 키보드 높이는 기기·순간마다 달라지는 값이라 토큰 대신 inline style로 준다
      style={lift ? { bottom: lift } : undefined}
    >
      {children}
    </div>
  );
}
