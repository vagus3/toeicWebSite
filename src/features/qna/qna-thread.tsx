"use client";

import { CaretLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/shared/avatar";
import { MessageComposer } from "@/components/shared/message-composer";
import { PinnedFooter } from "@/components/shared/pinned-footer";
import { ScreenHeader } from "@/components/shared/screen-header";
import { DetailGate } from "@/features/party/detail-gate";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";
import { AiAnswers } from "./ai-conversation";

type Target = "member" | "ai";
const TARGETS: { value: Target; label: string }[] = [
  { value: "member", label: "파티원에게" },
  { value: "ai", label: "AI에게" },
];

/**
 * 질문 상세 (보드 6a) — 질문 · AI 답변 · 파티원 답변.
 * 입력창은 화면 아래 하나만 두고 [파티원에게 | AI에게]로 보낼 곳을 고른다.
 */
export function QnaThread({ threadId }: { threadId: string }) {
  const thread = useStudyStore((s) => s.threads.find((t) => t.id === threadId));
  const myId = useStudyStore((s) => s.me.id);
  const saving = useStudyStore((s) => s.saving);
  const askAi = useStudyStore((s) => s.askAi);
  const addReply = useStudyStore((s) => s.addReply);
  const confirmAi = useStudyStore((s) => s.confirmAi);
  const [target, setTarget] = useState<Target>("member");
  // 보낼 곳을 바꿔도 쓰던 내용은 남긴다
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);

  return (
    <div className="flex w-full max-w-thread flex-1 flex-col gap-5">
      <ScreenHeader
        leading={{ href: ROUTES.qna, label: "질문 목록", icon: CaretLeft }}
        title="질문"
        subtitle={thread ? `${thread.tag} · ${thread.who}` : undefined}
      />
      <DetailGate>
        {thread ? (
          <article aria-label="선택한 질문" className="flex min-w-0 flex-col gap-5">
            <h2 className="m-0 whitespace-pre-wrap break-words text-title leading-question font-normal tracking-normal md:text-heading">
              {thread.title}
            </h2>
            <AiAnswers
              thread={thread}
              myId={myId}
              pending={asking}
              confirming={saving}
              onConfirm={(turnId, confirmed) =>
                void confirmAi(thread.id, turnId, confirmed)
              }
            />
            <section aria-labelledby="qna-replies-title" className="flex flex-col gap-3">
              <h3 id="qna-replies-title" className="m-0 text-body">
                파티원 답변 · {thread.replies.length}
              </h3>
              {!thread.replies.length && (
                <p className="m-0 text-meta text-muted">
                  설명이나 다른 풀이를 답변으로 남겨 주세요.
                </p>
              )}
              {thread.replies.map((reply, i) => (
                <div key={i} className="flex gap-2.5">
                  <Avatar initial={reply.initial} size="sm" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-label">
                      <b className="font-medium">{reply.name}</b>{" "}
                      <span className="tag tag-accent px-1.5 py-px text-micro">보충</span>
                    </span>
                    <span className="whitespace-pre-wrap break-words text-meta leading-normal md:text-body">
                      {reply.text}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          </article>
        ) : (
          <p className="m-0 text-meta text-muted">
            질문을 찾을 수 없어요. 삭제됐거나 다른 파티의 질문일 수 있어요.{" "}
            <Link href={ROUTES.qna} className="text-accent underline">
              질문 목록으로
            </Link>
          </p>
        )}
      </DetailGate>

      {thread && (
        <PinnedFooter keyboardAware>
          <div role="radiogroup" aria-label="보낼 곳" className="seg self-start">
            {TARGETS.map((option) => (
              <label key={option.value} className="seg-opt">
                <input
                  type="radio"
                  name="qna-target"
                  value={option.value}
                  checked={target === option.value}
                  onChange={() => setTarget(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          <MessageComposer
            value={draft}
            onValueChange={setDraft}
            label={target === "ai" ? "AI에게 질문" : "파티원 답변"}
            placeholder={
              target === "ai" ? "AI에게 이어서 물어보기" : "보충 설명이나 다른 풀이 남기기"
            }
            maxLength={target === "ai" ? 2000 : 1000}
            disabled={saving || asking}
            hint={
              target === "ai"
                ? "질문과 AI 대화는 Groq에 전달되고 파티원에게 공유돼요. 개인정보는 쓰지 마세요. AI 답변은 틀릴 수 있어요."
                : undefined
            }
            onSend={async (text) => {
              if (target === "member") {
                if (!(await addReply(thread.id, text))) return false;
                return;
              }
              setAsking(true);
              try {
                if (!(await askAi(thread.id, text))) return false;
              } finally {
                setAsking(false);
              }
            }}
          />
        </PinnedFooter>
      )}
    </div>
  );
}
