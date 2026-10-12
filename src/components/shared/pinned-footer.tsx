import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 전체 화면의 하단 고정 영역 (입력창, 다음 버튼). pb-safe로 홈 바 위에 놓인다.
 * 탭바가 있는 화면에서는 쓰지 않는다. 탭바가 이 영역을 가리기 때문이다.
 */
export function PinnedFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rule-top sticky bottom-0 z-30 -mx-5 flex flex-col gap-2.5 bg-bg px-5 pt-3 pb-safe md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0 md:pb-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
