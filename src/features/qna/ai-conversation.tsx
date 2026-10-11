"use client";

import { useRef, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useStudyStore } from "@/stores/study-store";
import type { QnaThread } from "@/types";

export function AiConversation({ thread }: { thread: QnaThread }) {
  const askAi = useStudyStore((s) => s.askAi);
  const saving = useStudyStore((s) => s.saving);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const sending = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || saving || sending.current) return;
    sending.current = true;
    setPending(true);
    try {
      if (await askAi(thread.id, text)) setPrompt("");
    } finally {
      sending.current = false;
      setPending(false);
    }
  };

  return (
    <section aria-label="AI와 대화" className="flex flex-col gap-4 rounded-md bg-accent-900 p-3.5 md:p-4">
      <h3 className="m-0 flex items-center gap-1.5 text-body text-accent-300">
        <Sparkle /> AI와 대화
      </h3>
      {thread.ai ? (
        <div className="flex flex-col gap-1">
          <span className="text-label text-accent-300">AI 답변</span>
          <p className="m-0 whitespace-pre-wrap break-words text-meta leading-reading md:text-body">{thread.ai}</p>
        </div>
      ) : (
        <p className="m-0 text-meta text-muted">아직 AI 답변이 없어요. 아래에 궁금한 내용을 입력해 주세요.</p>
      )}
      {(thread.aiTurns ?? []).map((turn) => (
        <div key={turn.id} className="flex flex-col gap-3 border-t border-divider pt-3">
          <div>
            <span className="text-label text-muted">{turn.name}의 질문</span>
            <p className="m-0 whitespace-pre-wrap break-words text-meta leading-reading md:text-body">{turn.prompt}</p>
          </div>
          <div>
            <span className="text-label text-accent-300">AI 답변</span>
            <p className="m-0 whitespace-pre-wrap break-words text-meta leading-reading md:text-body">{turn.answer}</p>
          </div>
        </div>
      ))}
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor={`ai-prompt-${thread.id}`} className="text-meta">AI에게 질문하기</label>
        <textarea
          id={`ai-prompt-${thread.id}`}
          className="input min-h-24"
          rows={3}
          maxLength={2000}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={pending}
          placeholder="예: 왜 이 문장에서 현재완료를 쓰는지 예문으로 설명해 줘"
          aria-describedby={`ai-notice-${thread.id}`}
        />
        <p id={`ai-notice-${thread.id}`} className="m-0 text-label text-muted">
          질문과 AI 대화는 Groq에 전달되고 파티원에게 공유돼요. 개인정보는 입력하지 마세요. AI 답변은 틀릴 수 있어요.
        </p>
        <Button type="submit" variant="primary" className="self-end" disabled={saving || pending || !prompt.trim()}>
          {pending ? "AI가 답변하는 중…" : "AI에게 질문"}
        </Button>
        {pending && <p role="status" className="m-0 text-meta text-muted">이전 질문과 대화를 참고해 답변을 만들고 있어요.</p>}
      </form>
    </section>
  );
}
