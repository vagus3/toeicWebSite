"use client";

import { useSyncExternalStore } from "react";

/** globals.css의 --breakpoint-md(48rem)와 같은 기준 */
export const MOBILE_QUERY = "(max-width: 47.99rem)";

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}
