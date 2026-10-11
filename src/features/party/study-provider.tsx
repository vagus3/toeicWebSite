"use client";

import { useEffect, useState } from "react";
import type { StudySnapshot } from "@/lib/study-model";
import { createStudyStore, StudyStoreContext } from "@/stores/study-store";

export function StudyProvider({
  initial,
  children,
}: {
  initial: StudySnapshot;
  children: React.ReactNode;
}) {
  const [store] = useState(() => createStudyStore(initial));
  useEffect(() => {
    if (initial.mode !== "live") return;
    // 첫 화면은 이미 그려졌으므로 상세 기록은 뒤에서 불러오고, 해당 화면만 기다린다.
    void store.getState().loadDetail();
    const refresh = () => {
      if (document.visibilityState === "visible")
        void store
          .getState()
          .refresh()
          .catch(() => {});
    };
    const interval = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [store, initial.mode]);
  return <StudyStoreContext value={store}>{children}</StudyStoreContext>;
}
