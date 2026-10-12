import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewRetry } from "@/features/review/review-retry";

export const metadata: Metadata = { title: "오답 다시 풀기" };

export default function ReviewRetryPage() {
  return (
    <Suspense>
      <ReviewRetry />
    </Suspense>
  );
}
