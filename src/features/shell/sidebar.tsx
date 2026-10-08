"use client";

import { GoogleDriveLogo, Link as LinkIcon, SignOut, UploadSimple, type Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/shared/avatar";
import { BrandMark } from "@/components/shared/brand-mark";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button, type ButtonProps } from "@/components/ui/button";
import { usePartySummary } from "@/features/party/use-party";
import { ME } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { isActive, NAV_ITEMS, type NavItem } from "./nav-items";
import { useCopyInvite, useDriveFolder, useLogout } from "./shell-actions";

/** 사이드바 한 줄(아이콘 + 라벨) 공통 간격 */
const ROW = "justify-start gap-2.5 px-2.5 py-2.25";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("btn text-body", ROW, active ? "bg-accent-900 text-accent-200" : "text-text")}>
      <Icon weight={active ? "fill" : "regular"} className="text-icon" />
      {item.label}
    </Link>
  );
}

function SidebarAction({ icon: IconComponent, label, className, ...props }: ButtonProps & { icon: Icon; label: string }) {
  return (
    <Button className={cn(ROW, "text-meta", className)} {...props}>
      <IconComponent className="text-icon" />
      {label}
    </Button>
  );
}

/** 데스크톱 좌측 내비게이션 (웹 시안) */
export function Sidebar() {
  const pathname = usePathname();
  const openUpload = useStudyStore((s) => s.openUpload);
  const copyInvite = useCopyInvite();
  const openDrive = useDriveFolder();
  const logout = useLogout();
  const party = usePartySummary();

  return (
    <nav aria-label="주 메뉴" className="sticky top-0 hidden h-dvh w-sidebar flex-none flex-col gap-0.5 bg-neutral-900 px-3.5 py-6 md:flex">
      <div className="flex items-center gap-2.5 px-2.5 pb-1">
        <BrandMark size="sm" />
        <span className="text-base font-medium">{party.name}</span>
      </div>
      <span className="pr-2.5 pb-4.5 pl-12 text-label text-muted">{party.summary}</span>

      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
      ))}

      <div className="flex-1" />

      <SidebarAction variant="primary" className="mb-1.5 text-body" icon={UploadSimple} label="오늘 인증 올리기" onClick={() => openUpload()} />
      <SidebarAction icon={LinkIcon} label="초대 링크 복사" onClick={copyInvite} />
      <SidebarAction icon={GoogleDriveLogo} label="드라이브 폴더" onClick={openDrive} />
      <ThemeToggle label="long" className={cn(ROW, "text-meta")} iconClassName="text-icon" />

      <div className="flex items-center gap-2.5 px-2.5 pt-3">
        <Avatar initial={ME.initial} size="sm" me />
        <span className="flex-1 text-meta">{ME.name}</span>
        <span className="tag tag-accent">{ME.track}</span>
        <Button size="icon" className="size-7" onClick={logout} title="로그아웃" aria-label="로그아웃">
          <SignOut />
        </Button>
      </div>
    </nav>
  );
}
