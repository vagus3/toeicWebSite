"use client";

import { Image as PhotoIcon } from "@phosphor-icons/react";

export function DriveSaveHint() {
  return (
    <p className="flex items-center gap-1.5 text-label text-muted">
      <PhotoIcon />내 Drive에 저장 · 파티원은 앱에서 확인
    </p>
  );
}
