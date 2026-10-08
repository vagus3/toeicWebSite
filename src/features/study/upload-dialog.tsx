"use client";

import { Check, CheckCircle, Image as ImageIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TASKS } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { useModal, useStudyStore } from "@/stores/study-store";
import { DriveSaveHint } from "./drive-save-hint";
import { evidenceTitle, usePhotoPicker, useSubmitEvidence } from "./use-evidence-upload";

/** 데스크톱 인증 모달 (웹 시안) */
export function UploadDialog() {
  const { open, close, onOpenChange } = useModal("upload");
  const done = useStudyStore((s) => s.done);
  const selection = useStudyStore((s) => s.uploadSelection);
  const select = useStudyStore((s) => s.selectUpload);
  const photo = usePhotoPicker();
  const { submit, pending } = useSubmitEvidence();
  const { reset } = photo;

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = async () => {
    if (!selection || !photo.file) return;
    if (await submit(selection, photo.file)) close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(var(--container-dialog-wide),calc(100%-2*var(--space-4)))]">
        <DialogTitle>{evidenceTitle()}</DialogTitle>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="인증할 항목">
          {TASKS.map((t) => {
            const isDone = done[t.id];
            const selected = selection === t.id;
            return (
              <Button
                key={t.id}
                role="radio"
                aria-checked={selected}
                variant={selected ? "primary" : "secondary"}
                className={cn("text-meta", isDone && "line-through")}
                disabled={isDone}
                title={isDone ? "이미 인증 완료" : "인증하기"}
                onClick={() => select(t.id)}
              >
                {isDone && <Check />}
                {t.short}
              </Button>
            );
          })}
        </div>
        <p className="m-0 -mt-1.5 text-label text-muted">
          체크된 항목은 이미 인증돼서 다시 선택할 수 없어요
        </p>

        <input {...photo.inputProps} />
        <button
          type="button"
          onClick={photo.open}
          {...photo.dropProps}
          className={cn(
            "flex h-dropzone cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-accent text-accent",
            photo.file ? "bg-accent-faint" : "bg-transparent",
          )}
        >
          {photo.file ? (
            <CheckCircle className="text-icon-2xl" />
          ) : (
            <ImageIcon className="text-icon-2xl" />
          )}
          <span className="text-meta">
            {photo.file ? photo.file.name : "사진을 끌어다 놓거나 클릭해서 선택"}
          </span>
        </button>

        <DriveSaveHint />

        <DialogActions>
          <Button variant="secondary" onClick={close}>
            취소
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={!photo.file || !selection || pending}
          >
            {pending ? "올리는 중…" : "인증 올리기"}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
