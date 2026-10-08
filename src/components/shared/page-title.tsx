import { cn } from "@/lib/utils";

/** 페이지 제목 — 모바일 text-heading, 데스크톱 text-h3 */
export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return <h1 className={cn("m-0 text-heading md:text-h3", className)} {...props} />;
}
