import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-7 text-caption",
  md: "size-8 text-label",
} as const;

interface AvatarProps {
  initial: string;
  size?: keyof typeof SIZE;
  /** 내 프로필 표시 (accent 톤) */
  me?: boolean;
  className?: string;
}

export function Avatar({ initial, size = "md", me, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn("grid flex-none place-items-center rounded-full", SIZE[size], me ? "bg-accent-800 text-accent-100" : "bg-neutral-800", className)}
    >
      {initial}
    </span>
  );
}
