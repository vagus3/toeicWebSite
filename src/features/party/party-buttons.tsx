"use client";

import { Confetti, HandPointing } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { useToast } from "@/stores/toast-store";
import type { Member } from "@/types";

interface NudgeButtonProps {
  member: Pick<Member, "id" | "name">;
  variant?: "ghost" | "secondary";
  withIcon?: boolean;
  className?: string;
}

/** 콕 찌르기 — 멤버별 하루 한 번, 보내면 "보냄"으로 바뀐다 (nudges 테이블 + 푸시로 확장) */
export function NudgeButton({
  member,
  variant = "ghost",
  withIcon = true,
  className,
}: NudgeButtonProps) {
  const nudged = useStudyStore((s) => s.nudgedIds.includes(member.id));
  const nudge = useStudyStore((s) => s.nudge);
  const flash = useToast((s) => s.flash);
  const saving = useStudyStore((s) => s.saving);

  return (
    <Button
      variant={variant}
      className={cn("text-label", className)}
      disabled={nudged || saving}
      onClick={async () => {
        if (!(await nudge(member.id))) return;
        flash(`${member.name}님에게 콕 찔렀어요`);
      }}
    >
      {withIcon && <HandPointing />}
      {nudged ? "보냄" : "콕 찌르기"}
    </Button>
  );
}

interface CheerButtonProps {
  name: string;
  /** 피드 항목 순서 — 주면 축하 수를 올리고 옆에 표시 */
  feedIndex?: number;
  label?: string;
  className?: string;
  logId?: string;
}

/** 축하 — 피드면 축하 수 증가, 트래커면 축하만 */
export function CheerButton({
  name,
  feedIndex,
  label,
  className,
  logId,
}: CheerButtonProps) {
  const count = useStudyStore((s) =>
    feedIndex === undefined ? null : s.feedCheers[feedIndex],
  );
  const cheerFeed = useStudyStore((s) => s.cheerFeed);
  const cheerLog = useStudyStore((s) => s.cheerLog);
  const saving = useStudyStore((s) => s.saving);
  const mode = useStudyStore((s) => s.mode);
  const flash = useToast((s) => s.flash);

  return (
    <Button
      variant="secondary"
      className={cn("text-label", className)}
      disabled={
        saving || (mode === "live" && feedIndex === undefined && !logId)
      }
      onClick={async () => {
        if (feedIndex !== undefined && !(await cheerFeed(feedIndex))) return;
        if (logId && !(await cheerLog(logId))) return;
        flash(`${name}님을 축하했어요`);
      }}
    >
      <Confetti />
      {[label, count].filter((v) => v !== undefined && v !== null).join(" ")}
    </Button>
  );
}
