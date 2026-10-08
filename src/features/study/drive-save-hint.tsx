import { GoogleDriveLogo } from "@phosphor-icons/react";
import { evidenceFolderLabel } from "./use-evidence-upload";

/** "새벽토익/형규/2026-10-08 에 저장" */
export function DriveSaveHint() {
  return (
    <div className="flex items-center gap-1.5 text-label text-muted">
      <GoogleDriveLogo />
      {evidenceFolderLabel()} 에 저장
    </div>
  );
}
