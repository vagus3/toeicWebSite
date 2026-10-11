"use client";

import { Image as PhotoIcon } from "@phosphor-icons/react";

export function DriveSaveHint() {
  return (
    <p className="flex items-center gap-1.5 text-label text-muted">
      <PhotoIcon />
      인증 사진은 파티원만 볼 수 있어요
    </p>
  );
}
