"use client";

import { useStudyStore } from "@/stores/study-store";

/**
 * 파티 전체 기록(피드·질문·점수·멤버 통계)이 도착하기 전까지 자리만 보여준다.
 * 도착 전에 그리면 "연속 0일", "아직 인증 안 함" 같은 잘못된 값이 잠깐 보인다.
 */
export function DetailGate({ children }: { children: React.ReactNode }) {
  const ready = useStudyStore((s) => s.detailReady);
  const failed = useStudyStore((s) => s.detailError);
  if (failed && !ready)
    return (
      <p className="text-muted">
        파티 기록을 불러오지 못했어요. 잠시 후 새로고침해 주세요.
      </p>
    );
  if (!ready)
    return <p className="text-muted">파티 기록을 불러오는 중이에요…</p>;
  return <>{children}</>;
}
