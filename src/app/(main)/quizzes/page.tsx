import type { Metadata } from "next";
import { DetailGate } from "@/features/party/detail-gate";
import { TestOverview } from "@/features/quiz/test-overview";

export const metadata: Metadata = { title: "테스트" };

export default function QuizzesPage() {
  return (
    <DetailGate>
      <TestOverview />
    </DetailGate>
  );
}
