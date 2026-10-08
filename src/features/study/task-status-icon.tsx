import { CheckCircle, Circle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** 할당량 인증 여부 — 완료는 채워진 accent 체크, 미완료는 빈 원 */
export function TaskStatusIcon({ done, className, todoClassName = "text-neutral-600" }: { done: boolean; className?: string; todoClassName?: string }) {
  return done ? (
    <CheckCircle weight="fill" className={cn("text-accent", className)} aria-label="인증 완료" />
  ) : (
    <Circle className={cn(todoClassName, className)} aria-label="미인증" />
  );
}
