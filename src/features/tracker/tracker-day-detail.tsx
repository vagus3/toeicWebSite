"use client";

import {
  BookmarkSimple,
  BookOpen,
  Headphones,
  TextAa,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CheerButton, NudgeButton } from "@/features/party/party-buttons";
import { EvidencePhoto, evidenceUrl } from "@/features/study/evidence-photo";
import { TASKS } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { dayDetail } from "./tracker-data";

/**
 * 트래커 칸 상세 — 그날 항목별 인증, 인증 사진, 축하·콕 찌르기, 기록 화면 바로가기.
 * 데스크톱은 히트맵 옆, 모바일은 월간 잔디 아래에 놓인다. controls에는 모바일의 멤버·날짜 고르기를 넣는다.
 */
export function TrackerDayDetail({
  detail,
  live,
  controls,
  className,
}: {
  detail: ReturnType<typeof dayDetail>;
  live: boolean;
  controls?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="고른 날의 기록"
      className={cn("card elev-sm gap-3.5 p-4.5", className)}
    >
      {controls}
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-title font-medium">{detail.title}</span>
        <span className="tag tag-accent">{detail.pct}</span>
      </div>
      <dl className="m-0 flex flex-col gap-2.5 text-meta">
        {[
          { icon: TextAa, label: "단어 · 50개", value: detail.word },
          { icon: Headphones, label: "LC · 15문제", value: detail.lc },
          { icon: BookOpen, label: "RC · 15문제", value: detail.rc },
          { icon: BookmarkSimple, label: "교재", value: detail.book },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-2.5">
            <Icon className="text-muted" />
            <dt className="flex-1">{label}</dt>
            <dd className="m-0 text-muted">{value}</dd>
          </div>
        ))}
      </dl>
      {detail.evidenceLogs.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {detail.evidenceLogs.map((log) => (
            <EvidencePhoto
              key={log.id}
              src={evidenceUrl(log.id)}
              alt={`${detail.title} ${TASKS.find((t) => t.id === log.category)?.short ?? ""} 인증 사진`}
            />
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <CheerButton name={detail.name} label="축하" logId={detail.logId} />
        {/* 나 자신은 콕 찌를 수 없다 (서버도 거절한다) */}
        {!detail.member.isMe && <NudgeButton member={detail.member} variant="secondary" />}
        {live && (
          <Button asChild variant="ghost" className="text-meta">
            <Link href={`${ROUTES.records}?memberId=${detail.member.id}&month=${detail.month}`}>
              기록에서 보기
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
