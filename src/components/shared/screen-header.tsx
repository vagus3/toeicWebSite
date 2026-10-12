import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconLink } from "./icon-link";

interface ScreenHeaderProps {
  title: ReactNode;
  /** 제목 아래 작은 글씨 (파티 이름 · 인원 등) */
  subtitle?: ReactNode;
  /** 왼쪽 버튼: 닫기(X) 또는 뒤로(‹) */
  leading: { href: string; label: string; icon: Icon };
  /** 오른쪽 자리 (완료 개수, 알림 버튼 등) */
  trailing?: ReactNode;
  /** 둘째 줄 (문항 진행 막대, 보기 필터 등) */
  below?: ReactNode;
  className?: string;
}

/**
 * 전체 화면 상단 바. pt-safe로 상태바 아래에 놓이고, 스크롤해도 위에 떠 있다.
 * 데스크톱에서는 고정을 풀고 일반 제목 줄이 된다.
 */
export function ScreenHeader({
  title,
  subtitle,
  leading,
  trailing,
  below,
  className,
}: ScreenHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-5 flex flex-col gap-2.5 bg-bg px-5 pt-safe pb-2.5 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 pt-2 md:pt-0">
        <IconLink
          href={leading.href}
          label={leading.label}
          icon={leading.icon}
          iconClassName="text-icon-md md:text-icon"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="m-0 truncate text-base font-medium tracking-normal">
            {title}
          </h1>
          {subtitle && (
            <span className="truncate text-label text-muted">{subtitle}</span>
          )}
        </div>
        {trailing && (
          <span className="flex shrink-0 items-center text-label text-muted">
            {trailing}
          </span>
        )}
      </div>
      {below}
    </header>
  );
}
