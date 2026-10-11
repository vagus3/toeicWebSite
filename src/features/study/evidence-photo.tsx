"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** 비공개 API에서 사진을 받아 앱 안에서 확대한다. Drive 링크는 노출하지 않는다. */
export function EvidencePhoto({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const url = `${src}?retry=${attempt}`;
  if (failed)
    return (
      <div className="card flex flex-col gap-2 p-4 text-meta text-muted">
        <p>
          사진을 불러오지 못했어요. 올린 사람의 Drive 재연결이 필요하거나 파일이
          삭제되었을 수 있어요.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setFailed(false);
            setAttempt(attempt + 1);
          }}
        >
          다시 확인
        </Button>
      </div>
    );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} 확대`}
        className="w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 인증 쿠키를 사용하는 비공개 사진 API */}
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-feed-photo w-full rounded-md object-cover"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-3xl">
          <DialogTitle>{alt}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- 원본 크기 비공개 사진 */}
          <img
            src={url}
            alt={alt}
            onError={() => setFailed(true)}
            className="max-h-[70dvh] w-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
