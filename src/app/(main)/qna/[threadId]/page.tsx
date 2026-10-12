import type { Metadata } from "next";
import { QnaThread } from "@/features/qna/qna-thread";

export const metadata: Metadata = { title: "질문" };

/** 질문 상세 — 목록에서 누르거나 질문을 올린 뒤 들어온다 (/qna/[threadId]) */
export default async function QnaThreadPage({
  params,
}: PageProps<"/qna/[threadId]">) {
  const { threadId } = await params;
  return <QnaThread threadId={threadId} />;
}
