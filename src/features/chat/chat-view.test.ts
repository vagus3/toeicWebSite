import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/types";
import { AI_PENDING_MS, onlyQuestions, pendingAiIds } from "./chat-view";

const NOW = Date.parse("2026-10-08T07:10:00+09:00");

function message(id: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    roomId: "general",
    senderId: "seoyeon",
    senderName: "서연",
    initial: "서",
    content: "안녕하세요",
    createdAt: new Date(NOW).toISOString(),
    kind: "text",
    replyTo: null,
    logId: null,
    confirmedBy: [],
    cheeredBy: [],
    ...extra,
  };
}

const messages = [
  message("event", { kind: "system", content: "RC 인증", logId: "log-1" }),
  message("chat"),
  message("q1", { content: "@AI 현재완료가 뭐야?" }),
  message("a1", { kind: "ai", replyTo: "q1", content: "답변" }),
  message("q2", { content: "@AI because of 설명" }),
  message("fail2", { kind: "system", replyTo: "q2", content: "AI가 답하지 못했어요" }),
  message("q3", { content: "@AI 아직 답이 없는 질문" }),
];

describe("채팅 질문만 보기", () => {
  it("@AI 질문과 거기에 달린 답변·안내만 남긴다", () => {
    expect(onlyQuestions(messages).map((m) => m.id)).toEqual(["q1", "a1", "q2", "fail2", "q3"]);
  });
});

describe("AI 답변 대기", () => {
  it("답이 없는 최근 질문만 대기 중으로 본다", () => {
    expect([...pendingAiIds(messages, NOW + 1000)]).toEqual(["q3"]);
  });

  it("오래된 질문은 대기 표시를 거둔다", () => {
    expect(pendingAiIds(messages, NOW + AI_PENDING_MS).size).toBe(0);
  });
});
