"use client";

import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";
import type { StudyCategory } from "@/types";

/**
 * 인증 시작 — 데스크톱은 모달(웹 시안), 모바일은 전체 화면 촬영 페이지(프로토타입 시안)
 */
export function useStartUpload() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const openUpload = useStudyStore((s) => s.openUpload);
  const done = useStudyStore((s) => s.done);

  return (category?: StudyCategory) => {
    if (category && done[category]) return;
    if (isMobile) {
      router.push(category ? `${ROUTES.upload}?task=${category}` : ROUTES.upload);
    } else {
      openUpload(category);
    }
  };
}
