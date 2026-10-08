import { SunHorizon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/** 새벽 토익 로고 — accent 테두리 안의 해 뜨는 아이콘 */
export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={cn("grid flex-none place-items-center rounded-md border border-accent text-accent", size === "md" ? "size-8 text-icon" : "size-7 text-icon-sm")}
    >
      <SunHorizon />
    </span>
  );
}
