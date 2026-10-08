"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MessageComposerProps {
  placeholder: string;
  label: string;
  /** 보낸 뒤 입력창을 비우려면 true를 돌려준다 (비동기 가능) */
  onSend: (text: string) => boolean | void | Promise<boolean | void>;
  disabled?: boolean;
  maxLength?: number;
}

/** 입력창 + 보내기 — 질문 창구 보충 답변, 파티 채팅 (Enter로 전송) */
export function MessageComposer({
  placeholder,
  label,
  onSend,
  disabled,
  maxLength = 2000,
}: MessageComposerProps) {
  const [draft, setDraft] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || disabled) return;
    if ((await onSend(text)) !== false) setDraft("");
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        className="input flex-1"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label={label}
        maxLength={maxLength}
      />
      <Button
        type="submit"
        variant="primary"
        disabled={disabled || !draft.trim()}
        aria-label="보내기"
      >
        <PaperPlaneRight />
        <span className="hidden md:inline">보내기</span>
      </Button>
    </form>
  );
}
