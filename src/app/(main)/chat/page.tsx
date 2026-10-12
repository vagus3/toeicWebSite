"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";

/** 홈 화면 앱 바로가기(manifest shortcuts)용 — 파티 id를 모르는 고정 주소에서 현재 파티 채팅방으로 보낸다 */
export default function ChatShortcutPage() {
  const router = useRouter();
  const party = useStudyStore((s) => s.party);
  useEffect(() => {
    router.replace(ROUTES.chat(party?.id, party?.defaultChatRoomId));
  }, [party, router]);
  return (
    <p role="status" className="text-meta text-muted">
      파티 채팅을 여는 중이에요…
    </p>
  );
}
