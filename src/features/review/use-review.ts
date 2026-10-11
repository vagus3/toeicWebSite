"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HttpError, requestJson } from "@/lib/http";
import { useStudyStore } from "@/stores/study-store";
import { useToast } from "@/stores/toast-store";
import type { ReviewItem } from "./review-model";

type ReviewData = { items: ReviewItem[] };

export function reviewQueryKey(partyId: string | undefined) {
  return ["review", partyId] as const;
}

/** 내 오답노트. 테스트 화면의 카드와 오답노트 화면이 같은 캐시를 쓴다. */
export function useReviewItems() {
  const mode = useStudyStore((s) => s.mode);
  const partyId = useStudyStore((s) => s.party?.id);
  return useQuery({
    queryKey: reviewQueryKey(partyId),
    enabled: mode === "live" && Boolean(partyId),
    queryFn: async (): Promise<ReviewData> => {
      const response = await fetch(
        `/api/review?partyId=${encodeURIComponent(partyId!)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new HttpError(response.status, await response.text());
      return response.json();
    },
  });
}

/** 복습 완료 표시. 화면을 먼저 바꾸고, 저장에 실패하면 되돌린다. */
export function useToggleReviewed() {
  const client = useQueryClient();
  const partyId = useStudyStore((s) => s.party?.id);
  return async (item: ReviewItem) => {
    if (!partyId) return;
    const key = reviewQueryKey(partyId);
    const reviewed = !item.reviewed;
    const previous = client.getQueryData<ReviewData>(key);
    client.setQueryData<ReviewData>(key, (data) =>
      data && {
        items: data.items.map((i) => (i.key === item.key ? { ...i, reviewed } : i)),
      },
    );
    try {
      await requestJson(
        "/api/review",
        { partyId, source: item.source, sourceRef: item.sourceRef, number: item.number, reviewed },
        "PATCH",
      );
    } catch {
      client.setQueryData(key, previous);
      useToast.getState().flash("복습 상태를 저장하지 못했어요. 다시 시도해 주세요");
    }
  };
}
