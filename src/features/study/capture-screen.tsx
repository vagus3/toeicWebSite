"use client";

import { Camera, X } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconLink } from "@/components/shared/icon-link";
import { Button } from "@/components/ui/button";
import { TASKS } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useDoneCount, useStudyStore } from "@/stores/study-store";
import type { StudyCategory } from "@/types";
import { DriveSaveHint } from "./drive-save-hint";
import { TaskStatusIcon } from "./task-status-icon";
import { evidenceTitle, usePhotoPicker, useSubmitEvidence } from "./use-evidence-upload";

function usePreviewUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

/** 모바일 인증 화면 — 항목 고르고 바로 촬영 (프로토타입 시안) */
export function CaptureScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const done = useStudyStore((s) => s.done);
  const doneCount = useDoneCount();
  const requested = params.get("task") as StudyCategory | null;
  const firstTodo = TASKS.find((t) => !done[t.id])?.id ?? null;
  const [selection, setSelection] = useState<StudyCategory | null>(
    requested && !done[requested] ? requested : firstTodo,
  );
  const photo = usePhotoPicker();
  const preview = usePreviewUrl(photo.file);
  const { submit, pending } = useSubmitEvidence();

  const choose = (id: StudyCategory) => {
    if (done[id] || selection === id) return;
    setSelection(id);
    photo.reset();
  };

  const onSubmit = async () => {
    if (!selection || !photo.file) return;
    if (await submit(selection, photo.file)) router.push(ROUTES.dashboard);
  };

  return (
    <div className="flex flex-col gap-3.5 md:max-w-quiz">
      <div className="flex items-center gap-2.5">
        <IconLink href={ROUTES.dashboard} label="닫기" icon={X} />
        <h1 className="m-0 flex-1 text-base font-medium tracking-normal">{evidenceTitle()}</h1>
        <span className="text-label text-muted">
          {doneCount}/{TASKS.length} 완료
        </span>
      </div>
      <span className="text-label text-muted">인증할 항목을 고르고 사진을 찍어요</span>

      <input {...photo.inputProps} />
      {TASKS.map((t) => {
        const isDone = done[t.id];
        const selected = selection === t.id && !isDone;
        return (
          <div
            key={t.id}
            role="button"
            tabIndex={isDone ? -1 : 0}
            aria-disabled={isDone}
            aria-pressed={selected}
            title={isDone ? "이미 인증 완료" : "인증하기"}
            onClick={() => choose(t.id)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && choose(t.id)}
            className={cn(
              "card gap-2.5 p-3.5",
              isDone ? "cursor-not-allowed opacity-45" : "cursor-pointer",
              selected ? "shadow-ring-accent" : "shadow-sm",
            )}
          >
            <div className="flex items-center gap-2.5">
              <TaskStatusIcon done={isDone} className="text-icon-md" />
              <span className="flex-1 text-body">{t.label}</span>
              <span className="text-label text-muted">{t.mobileSub}</span>
            </div>
            {selected && (
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="사진 촬영"
                  onClick={(e) => {
                    e.stopPropagation();
                    photo.open();
                  }}
                  className="grid size-thumb place-items-center rounded-sm border border-dashed border-accent text-accent"
                >
                  <Camera className="text-icon-lg" />
                </button>
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기
                  <img
                    src={preview}
                    alt="촬영한 인증 사진"
                    className="size-thumb rounded-sm object-cover"
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="min-h-4 flex-1" />
      <DriveSaveHint />
      <Button
        variant="primary"
        className="h-control-xl w-full text-base"
        onClick={onSubmit}
        disabled={!photo.file || !selection || pending}
      >
        {pending ? "올리는 중…" : "인증 올리기"}
      </Button>
    </div>
  );
}
