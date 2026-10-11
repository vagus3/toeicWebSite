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
