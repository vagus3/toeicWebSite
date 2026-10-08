"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";

interface ThemeToggleProps {
  /** short: "라이트"(로그인), long: "라이트 모드"(사이드바), icon: 아이콘만(모바일 헤더) */
  label?: "short" | "long" | "icon";
  variant?: ButtonProps["variant"];
  className?: string;
  iconClassName?: string;
}

/** 다크 ↔ 라이트 전환 — 지금이 다크면 "라이트"로 바꾸는 버튼을 보여준다 */
export function ThemeToggle({ label = "short", variant = "plain", className, iconClassName }: ThemeToggleProps) {
  const { mode, toggle } = useThemeStore();
  const Icon = mode === "dark" ? Sun : Moon;
  const target = mode === "dark" ? "라이트" : "다크";

  if (label === "icon") {
    return (
      <Button size="icon" variant={variant} className={className} onClick={toggle} aria-label={`${target} 모드로 전환`}>
        <Icon className={cn("text-icon-md", iconClassName)} />
      </Button>
    );
  }

  return (
    <Button variant={variant} className={className} onClick={toggle}>
      <Icon className={iconClassName} />
      {label === "long" ? `${target} 모드` : target}
    </Button>
  );
}
