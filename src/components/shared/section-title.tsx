import { cn } from "@/lib/utils";

/** 섹션 제목 (이번 주 파티, 피드, 내 점수 추이 …) — text-title / medium */
export function SectionTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("m-0 text-title leading-normal font-medium tracking-normal", className)}
      {...props}
    />
  );
}
