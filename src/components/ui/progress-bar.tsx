import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  /** 진행 막대에 accent 글로우 (오늘 진행률) */
  glow?: boolean;
  /** 트랙 높이·폭 등은 className으로 (기본 h-1) */
  className?: string;
  barClassName?: string;
  label?: string;
}

export function ProgressBar({ value, glow, className, barClassName, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn("h-1 rounded-xs bg-neutral-800", className)}
    >
      {/* 폭은 데이터 값이라 style로만 넘긴다 */}
      <div className={cn("h-full rounded-xs bg-accent transition-[width] duration-400", glow && "shadow-glow", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}
