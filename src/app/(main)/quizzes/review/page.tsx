import type { Metadata } from "next";
import { ReviewBoard } from "@/features/review/review-board";

export const metadata: Metadata = { title: "오답노트" };

export default function ReviewPage() {
  return <ReviewBoard />;
}
