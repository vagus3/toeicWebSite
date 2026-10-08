"use client";

import imageCompression from "browser-image-compression";
import { useCallback, useRef, useState } from "react";
import { DEMO_TODAY, ME, PARTY } from "@/lib/demo-data";
import { formatMonthDay, toStudyDate } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { useToast } from "@/stores/toast-store";
import type { StudyCategory } from "@/types";

const MAX_UPLOAD_MB = 1;

/** 인증 화면 제목: "10월 8일 인증" */
export function evidenceTitle() {
  return `${formatMonthDay(DEMO_TODAY)} 인증`;
}

/** 드라이브 저장 경로: 새벽토익/형규/2026-10-08 */
export function evidenceFolderLabel() {
  return `${PARTY.driveRoot}/${ME.name}/${toStudyDate(DEMO_TODAY)}`;
}

/** 사진 선택(촬영)·드래그 앤 드롭 상태 */
export function usePhotoPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const reset = useCallback(() => setFile(null), []);

  const accept = (f: File | undefined | null) => {
    if (f && f.type.startsWith("image/")) setFile(f);
  };

  return {
    file,
    reset,
    open: () => inputRef.current?.click(),
    inputProps: {
      ref: inputRef,
      type: "file" as const,
      accept: "image/*",
      capture: "environment" as const,
      hidden: true,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        accept(e.target.files?.[0]);
        e.target.value = "";
      },
    },
    dropProps: {
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        accept(e.dataTransfer.files?.[0]);
      },
    },
  };
}

/**
 * 인증 올리기 — 압축 → /api/upload(Drive 저장 + study_evidences 기록) → 진행률 반영
 * 드라이브가 아직 연결되지 않았으면 서버가 skipped를 돌려주고, 진행률만 반영한다.
 */
export function useSubmitEvidence() {
  const completeTask = useStudyStore((s) => s.completeTask);
  const flash = useToast((s) => s.flash);
  const [pending, setPending] = useState(false);

  const submit = async (category: StudyCategory, file: File) => {
    setPending(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: MAX_UPLOAD_MB, maxWidthOrHeight: 2048, useWebWorker: true });
      const body = new FormData();
      body.append("file", compressed, file.name);
      body.append("category", category);
      body.append("partyId", PARTY.id);
      body.append("studyDate", toStudyDate(DEMO_TODAY));
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok && res.status !== 501) throw new Error(await res.text());
      completeTask(category);
      flash("드라이브에 저장하고 파티에 공유했어요");
      return true;
    } catch {
      flash("업로드에 실패했어요. 잠시 후 다시 시도해 주세요");
      return false;
    } finally {
      setPending(false);
    }
  };

  return { submit, pending };
}
