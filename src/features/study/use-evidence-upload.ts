"use client";

import imageCompression from "browser-image-compression";
import { useCallback, useRef, useState } from "react";

import { formatMonthDay } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { useToast } from "@/stores/toast-store";
import type { StudyCategory } from "@/types";

const MAX_UPLOAD_MB = 1;

/** 서버에서 받은 한국 학습일로 제목과 저장 경로를 만든다. */
export function useEvidenceLabels() {
  const date = useStudyStore((s) => s.studyDate);
  const party = useStudyStore((s) => s.party);
  const me = useStudyStore((s) => s.me);
  return {
    title: `${formatMonthDay(new Date(`${date}T12:00:00`))} 인증`,
    folder: `${party?.id}/${me.id}/${date}`,
  };
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
  const party = useStudyStore((s) => s.party);
  const mode = useStudyStore((s) => s.mode);
  const refresh = useStudyStore((s) => s.refresh);
  const flash = useToast((s) => s.flash);
  const [pending, setPending] = useState(false);

  const submit = async (category: StudyCategory, file: File) => {
    if (pending || !party) return false;
    setPending(true);
    try {
      if (mode === "demo") {
        completeTask(category);
        flash("데모 인증을 반영했어요. 사진은 저장되지 않아요");
        return true;
      }
      const compressed = await imageCompression(file, {
        maxSizeMB: MAX_UPLOAD_MB,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
      });
      const body = new FormData();
      body.append("file", compressed, file.name);
      body.append("category", category);
      body.append("partyId", party.id);
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) throw new Error(await res.text());
      completeTask(category);
      try {
        await refresh();
      } catch {
        /* DB 저장은 성공했으므로 업로드를 재시도하지 않는다. */
      }
      flash("인증 사진과 학습 기록을 저장했어요");
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
