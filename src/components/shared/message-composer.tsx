"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

interface MessageComposerProps {
  placeholder: string;
  label: string;
  /** 보낸 뒤 입력창을 비우려면 false가 아닌 값을 돌려준다 (비동기 가능) */
  onSend: (text: string) => boolean | void | Promise<boolean | void>;
  disabled?: boolean;
  maxLength?: number;
  /** 입력창 아래 안내 (예: "@AI로 시작하면 AI가 먼저 답해요") */
  hint?: React.ReactNode;
  /** 입력창 왼쪽 자리 (빠른 입력 칩 등) */
  leading?: React.ReactNode;
  /** 바깥에서 입력값을 다룰 때 — 빠른 입력 칩이 "@AI "를 붙이는 경우 등 */
  value?: string;
  onValueChange?: (value: string) => void;
}

/**
 * 입력창 + 보내기 — 질문 창구 답변, 파티 채팅.
 * 내용에 맞춰 높이가 늘어나는 textarea다. 데스크톱은 Enter로 보내고(Shift+Enter 줄바꿈),
 * 터치 기기는 Enter가 줄바꿈이고 보내기 버튼으로 보낸다.
 * 한글 조합 중 Enter는 조합 확정용이라 보내지 않는다. 보내면 마지막 글자가 잘리거나 두 번 간다.
 */
export function MessageComposer({
  placeholder,
  label,
  onSend,
  disabled,
  maxLength = 2000,
  hint,
  leading,
  value,
  onValueChange,
}: MessageComposerProps) {
  const [ownDraft, setOwnDraft] = useState("");
  const draft = value ?? ownDraft;
  const setDraft = onValueChange ?? setOwnDraft;
  const ref = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const touch = useMediaQuery("(pointer: coarse)");

  // 내용 높이에 맞춘다. 최대 높이(max-h-32)를 넘으면 안에서 스크롤된다.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || disabled) return;
    if ((await onSend(text)) !== false) setDraft("");
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-end gap-2">
        {leading}
        <textarea
          ref={ref}
          rows={1}
          className="input max-h-32 min-h-0 flex-1 resize-none overflow-y-auto"
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            // keyCode 229: 일부 브라우저가 조합 중 Enter를 isComposing 없이 보낸다
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (touch) return;
            event.preventDefault();
            void submit();
          }}
          aria-label={label}
          aria-describedby={hint ? hintId : undefined}
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
      </div>
      {hint && (
        <p id={hintId} className="m-0 text-label text-muted">
          {hint}
        </p>
      )}
    </form>
  );
}
