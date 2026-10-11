"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function evidenceUrl(logId: string) {
  return `/api/study/evidence/${logId}`;
}

/** 목록에는 작은 이미지를 쓴다. 서버가 썸네일이 없으면 원본으로 대체한다. */
function thumbUrl(src: string, attempt: number) {
  return `${src}?size=thumb${attempt ? `&retry=${attempt}` : ""}`;
}

/** 비공개 API에서 사진을 받아 앱 안에서 확대한다. Drive 링크는 노출하지 않는다. */
export function EvidencePhoto({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
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
          src={thumbUrl(src, attempt)}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-feed-photo w-full rounded-md object-cover"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-3xl">
          <DialogTitle>{alt}</DialogTitle>
          <EvidenceFull src={src} alt={alt} attempt={attempt} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** 이미 버튼인 카드 안에서 쓰는 썸네일. 실패하면 자리 표시만 한다. */
export function EvidenceThumb({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div
        className={cn(
          "photo-placeholder grid place-items-center rounded-md p-2 text-center text-caption text-muted",
          className,
        )}
      >
        사진을 불러오지 못했어요
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 인증 쿠키를 사용하는 비공개 사진 API
    <img
      src={thumbUrl(src, 0)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("rounded-md object-cover", className)}
    />
  );
}

/** 상세·확대용 원본 */
export function EvidenceFull({
  src,
  alt,
  attempt = 0,
}: {
  src: string;
  alt: string;
  attempt?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <p className="text-meta text-muted">
        원본을 불러오지 못했어요. 올린 사람의 Drive 재연결이 필요하거나 파일이
        삭제되었을 수 있어요.
      </p>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 원본 크기 비공개 사진
    <img
      src={attempt ? `${src}?retry=${attempt}` : src}
      alt={alt}
      onError={() => setFailed(true)}
      className="max-h-[70dvh] w-full object-contain"
    />
  );
}
