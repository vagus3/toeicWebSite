import type { Metadata } from "next";
import { Suspense } from "react";
import { CaptureScreen } from "@/features/study/capture-screen";

export const metadata: Metadata = { title: "오늘 인증" };

export default function UploadPage() {
  return (
    <Suspense>
      <CaptureScreen />
    </Suspense>
  );
}
