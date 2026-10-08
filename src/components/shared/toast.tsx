"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { useToast } from "@/stores/toast-store";

export function Toast() {
  const message = useToast((s) => s.message);
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-5 bottom-toast-mobile z-60 flex items-center gap-2 rounded-md bg-surface px-3.5 py-3 text-meta shadow-lg md:inset-x-auto md:right-6 md:bottom-6 md:px-4"
    >
      <CheckCircle className="shrink-0 text-icon-sm text-accent" />
      {message}
    </div>
  );
}
