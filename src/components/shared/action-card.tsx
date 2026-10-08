import { cn } from "@/lib/utils";

interface ActionCardProps {
  /** 왼쪽 아이콘 등 */
  leading?: React.ReactNode;
  kicker?: React.ReactNode;
  kickerClassName?: string;
  title: React.ReactNode;
  titleClassName?: string;
  description?: React.ReactNode;
  /** 오른쪽 버튼 · 아이콘 */
  action?: React.ReactNode;
  /** accent 테두리로 강조 (오늘의 일일 테스트) */
  highlight?: boolean;
  className?: string;
}

/** 키커 · 제목 · 설명 + 오른쪽 액션이 한 줄인 카드 (테스트 카드, 홈 바로가기, 콕 찌르기 카드) */
export function ActionCard({
  leading,
  kicker,
  kickerClassName,
  title,
  titleClassName = "text-body",
  description,
  action,
  highlight,
  className,
}: ActionCardProps) {
  return (
    <div
      className={cn(
        "card flex-row items-center gap-3 p-3.5",
        highlight ? "shadow-ring-accent" : "elev-sm",
        className,
      )}
    >
      {leading}
      <div className="flex flex-1 flex-col gap-0.5">
        {kicker && <span className={cn("card-kicker", kickerClassName)}>{kicker}</span>}
        <span className={titleClassName}>{title}</span>
        {description && <span className="text-label text-muted">{description}</span>}
      </div>
      {action}
    </div>
  );
}
