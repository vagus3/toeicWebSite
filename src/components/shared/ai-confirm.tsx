"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/** "지현, 서연 외 2명" */
function names(people: { name: string }[]) {
  const shown = people.slice(0, 2).map((p) => p.name).join(", ");
  return people.length > 2 ? `${shown} 외 ${people.length - 2}명` : shown;
}

/**
 * AI 답변 확인 — 채팅과 질문 창구가 같이 쓴다.
 * 아무도 확인하지 않았으면 "AI 초안 · 멤버 확인 전", 확인한 사람이 있으면 "✓ 지현 확인".
 * 버튼으로 내 확인을 남기거나 취소한다. AI 답변이 틀릴 수 있어서, 파티원이 본 답인지 알려 주는 표시다.
 */
export function AiConfirm({
  confirmedBy,
  myId,
  onToggle,
  pending,
}: {
  confirmedBy: { id: string; name: string }[];
  myId: string;
  onToggle: (confirmed: boolean) => void;
  pending?: boolean;
}) {
  const mine = confirmedBy.some((person) => person.id === myId);
  return (
    <div className="flex flex-wrap items-center gap-2 text-label">
      {confirmedBy.length ? (
        <span className="flex items-center gap-1 text-accent-300">
          <CheckCircle weight="fill" aria-hidden />
          {names(confirmedBy)} 확인
        </span>
      ) : (
        <span className="text-muted">AI 초안 · 멤버 확인 전</span>
      )}
      <Button
        variant={mine ? "secondary" : "ghost"}
        className="px-2 py-1 text-label"
        aria-pressed={mine}
        disabled={pending}
        onClick={() => onToggle(!mine)}
      >
        {mine ? "확인 취소" : "확인했어요"}
      </Button>
    </div>
  );
}
