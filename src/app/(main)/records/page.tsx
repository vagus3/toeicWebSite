import type { Metadata } from "next";
import { RecordsBoard } from "@/features/records/records-board";

export const metadata: Metadata = { title: "인증 기록" };

export default function RecordsPage() {
  return <RecordsBoard />;
}
