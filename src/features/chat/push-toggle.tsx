"use client";

import { Bell, BellRinging } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePushSubscription } from "./use-push-subscription";

/** 새 메시지 알림 켜기/끄기 — 채팅 헤더(라벨 포함), 모바일 헤더(아이콘만) */
export function PushToggle({ compact, className }: { compact?: boolean; className?: string }) {
  const { subscribed, toggle } = usePushSubscription();
  const BellIcon = subscribed ? BellRinging : Bell;
  const label = subscribed ? "알림 켜짐" : "알림 켜기";

  return (
    <Button
      variant={compact ? "plain" : "secondary"}
      size={compact ? "icon" : "default"}
      className={cn(!compact && "text-meta", className)}
      onClick={toggle}
      aria-pressed={subscribed}
      aria-label={compact ? (subscribed ? "알림 끄기" : "알림 켜기") : undefined}
    >
      <BellIcon className={cn(compact && "text-icon-md", subscribed && "text-accent")} />
      {!compact && label}
    </Button>
  );
}
