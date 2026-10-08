import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface IconLinkProps {
  href: string;
  label: string;
  icon: Icon;
  iconClassName?: string;
}

/** 아이콘만 있는 링크 버튼 (닫기, 채팅 바로가기 …) */
export function IconLink({
  href,
  label,
  icon: IconComponent,
  iconClassName = "text-icon-md",
}: IconLinkProps) {
  return (
    <Button asChild size="icon" aria-label={label}>
      <Link href={href}>
        <IconComponent className={iconClassName} />
      </Link>
    </Button>
  );
}
