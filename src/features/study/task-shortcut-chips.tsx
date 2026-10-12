import Link from "next/link";
import { cn } from "@/lib/utils";
import type { StudyCategory } from "@/types";
import { shortcutsFor } from "./task-shortcuts";

/** 항목 아래 "테스트로 인증" 칩 — 홈 체크리스트와 촬영 화면이 같이 쓴다 */
export function TaskShortcutChips({
  category,
  done,
  className,
}: {
  category: StudyCategory;
  done: boolean;
  className?: string;
}) {
  const shortcuts = shortcutsFor(category, done);
  if (!shortcuts.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {shortcuts.map((shortcut) => (
        <Link key={shortcut.href} href={shortcut.href} prefetch={false} className="tag tag-outline no-underline">
          {shortcut.label} →
        </Link>
      ))}
    </div>
  );
}
