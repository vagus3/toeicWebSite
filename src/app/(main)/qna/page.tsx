import type { Metadata } from "next";
import { QnaBoard } from "@/features/qna/qna-board";

export const metadata: Metadata = { title: "질문 창구" };

export default function QnaPage() {
  return <QnaBoard />;
}
