"use client";

import { Camera, Images, X } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PinnedFooter } from "@/components/shared/pinned-footer";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { TASKS } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useDoneCount, useStudyStore } from "@/stores/study-store";
import type { StudyCategory } from "@/types";
import { DriveBanner } from "./drive-banner";
import { DriveSaveHint } from "./drive-save-hint";
import { TaskShortcutChips } from "./task-shortcut-chips";
import { TaskStatusIcon } from "./task-status-icon";
import {
  useEvidenceLabels,
  usePhotoPicker,
  useSubmitEvidence,
} from "./use-evidence-upload";

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
  const { title } = useEvidenceLabels();
  const router = useRouter();
  const params = useSearchParams();
  const done = useStudyStore((s) => s.done);
  const doneCount = useDoneCount();
  const requested = TASKS.find((t) => t.id === params.get("task"))?.id;
  const firstTodo = TASKS.find((t) => !done[t.id])?.id ?? TASKS[0].id;
  const [selection, setSelection] = useState<StudyCategory | null>(
    requested ?? firstTodo,
  );
  const photo = usePhotoPicker();
  const preview = usePreviewUrl(photo.file);
  const { submit, pending } = useSubmitEvidence();

  const choose = (id: StudyCategory) => {
    if (selection === id) return;
    setSelection(id);
    photo.reset();
  };

  const onSubmit = async () => {
    if (!selection || !photo.file) return;
    if (await submit(selection, photo.file)) router.push(ROUTES.dashboard);
  };

  return (
    <div className="flex flex-1 flex-col gap-3.5 md:max-w-quiz">
      <ScreenHeader
        leading={{ href: ROUTES.dashboard, label: "닫기", icon: X }}
        title={title}
        trailing={`${doneCount}/${TASKS.length} 완료`}
      />
      <span className="text-label text-muted">
        사진을 하나 이상 올리면 해당 항목이 인증돼요. 인증 후에도 추가할 수 있어요.
      </span>

      <input {...photo.cameraInputProps} />
      <input {...photo.galleryInputProps} />
      {TASKS.map((t) => {
        const isDone = done[t.id];
        const selected = selection === t.id;
        return (
          <div
            key={t.id}
            className={cn(
              "card gap-2.5 p-3.5",
              selected ? "shadow-ring-accent" : "shadow-sm",
            )}
          >
            {/* 카드 머리만 항목 고르기 버튼이다. 촬영·앨범 버튼과 테스트 칩이 그 안에 겹치지 않게 한다 */}
            <button
              type="button"
              aria-pressed={selected}
              title={isDone ? "인증 사진 추가하기" : "인증하기"}
              onClick={() => choose(t.id)}
              className="flex w-full cursor-pointer items-center gap-2.5 text-left"
            >
              <TaskStatusIcon done={isDone} className="text-icon-md" />
              <span className="flex-1 text-body">{t.label}</span>
              <span className="text-label text-muted">{t.mobileSub}</span>
            </button>
            {selected && (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={photo.openCamera}
                    className="flex size-thumb flex-col items-center justify-center gap-0.5 rounded-sm border border-dashed border-accent text-micro text-accent"
                  >
                    <Camera aria-hidden className="text-icon-lg" />
                    촬영
                  </button>
                  <button
                    type="button"
                    onClick={photo.openGallery}
                    className="flex size-thumb flex-col items-center justify-center gap-0.5 rounded-sm border border-dashed border-divider text-micro text-muted"
                  >
                    <Images aria-hidden className="text-icon-lg" />
                    앨범
                  </button>
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기
                    <img
                      src={preview}
                      alt="고른 인증 사진"
                      className="size-thumb rounded-sm object-cover"
                    />
                  )}
                </div>
                <TaskShortcutChips category={t.id} done={isDone} />
              </>
            )}
          </div>
        );
      })}

      <PinnedFooter>
        {/* Drive가 연결되지 않았으면 저장 경로 대신 연결 안내를 먼저 보여 준다 (연결 상태는 실제 모드에서만 나온다) */}
        <DriveBanner inline />
        <DriveSaveHint />
        <Button
          variant="primary"
          className="h-control-xl w-full text-base"
          onClick={onSubmit}
          disabled={!photo.file || !selection || pending}
        >
          {pending ? "올리는 중…" : "인증 올리기"}
        </Button>
      </PinnedFooter>
    </div>
  );
}
