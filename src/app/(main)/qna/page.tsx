import type { Metadata } from "next";
import { DetailGate } from "@/features/party/detail-gate";
import { QnaBoard } from "@/features/qna/qna-board";

export const metadata: Metadata = { title: "질문 창구" };

export default function QnaPage() {
  return (
    <DetailGate>
      <QnaBoard />
    </DetailGate>
  );
}
