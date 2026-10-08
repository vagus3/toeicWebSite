"use client";

import { Camera, ChatTeardropText } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLink } from "@/components/shared/icon-link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PushToggle } from "@/features/chat/push-toggle";
import { usePartySummary } from "@/features/party/use-party";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { isActive, TAB_ITEMS, type NavItem } from "./nav-items";

/** 촬영·퀴즈 화면은 프로토타입처럼 탭/헤더 없이 전체 화면 */
const FULLSCREEN = [ROUTES.upload, ROUTES.dailyQuiz];

function useIsFullscreenRoute() {
  const pathname = usePathname();
  return FULLSCREEN.some((p) => pathname.startsWith(p));
}

/** 모바일 상단 — 파티 이름 + 화면 모드 + 채팅 + 알림 */
export function MobileHeader() {
  const party = usePartySummary();
  if (useIsFullscreenRoute()) return null;

  return (
    <header className="pt-safe flex items-center justify-between md:hidden">
      <span className="text-base font-medium">{party.name}</span>
      <span className="flex items-center gap-1">
        <ThemeToggle label="icon" />
        <IconLink href={ROUTES.chat()} label="파티 채팅" icon={ChatTeardropText} />
        <PushToggle compact />
      </span>
    </header>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-0.5 text-micro no-underline",
        active ? "text-accent hover:text-accent" : "text-neutral-500 hover:text-neutral-500",
      )}
    >
      <Icon className="text-icon-lg" />
      {item.tabLabel}
    </Link>
  );
}

/** 모바일 하단 탭 — 가운데 카메라 버튼으로 바로 인증 */
export function MobileTabBar() {
  const pathname = usePathname();
  if (useIsFullscreenRoute()) return null;
  const half = Math.ceil(TAB_ITEMS.length / 2);

  return (
    <nav
      aria-label="하단 탭"
      className="rule-top pb-safe fixed inset-x-0 bottom-0 z-40 flex items-center justify-around px-2 pt-2.5 md:hidden"
    >
      {TAB_ITEMS.slice(0, half).map((item) => (
        <TabLink key={item.href} item={item} active={isActive(pathname, item)} />
      ))}
      <Link
        href={ROUTES.upload}
        aria-label="오늘 인증 촬영"
        className="grid size-camera place-items-center rounded-full border border-accent text-accent shadow-camera"
      >
        <Camera className="text-icon-xl" />
      </Link>
      {TAB_ITEMS.slice(half).map((item) => (
        <TabLink key={item.href} item={item} active={isActive(pathname, item)} />
      ))}
    </nav>
  );
}
