"use client";

import { HandPointing, Trophy } from "@phosphor-icons/react";
import { ActionCard } from "@/components/shared/action-card";
import { Avatar } from "@/components/shared/avatar";
import { SectionTitle } from "@/components/shared/section-title";
import { useStudyStore } from "@/stores/study-store";
import { CheerButton, NudgeButton } from "./party-buttons";
import { lazyMember, useMembers } from "./use-party";
import { EvidencePhoto } from "@/features/study/evidence-photo";
import { cn } from "@/lib/utils";

/** 데스크톱 홈 우측 — 파티 피드 */
export function Feed({ className }: { className?: string }) {
  const feed = useStudyStore((s) => s.feed);
  return (
    <aside
      className={cn(
        "flex min-w-col-aside-min shrink basis-col-aside flex-col gap-5",
        className,
      )}
    >
      <SectionTitle>피드</SectionTitle>
      {feed.map((f, i) => (
        <article key={f.id} className="flex gap-2.5">
          <Avatar initial={f.initial} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-meta">
              <b className="font-medium">{f.name}</b>{" "}
              <span className="text-muted">{f.what}</span>
            </span>
            {f.photoUrl ? (
              <EvidencePhoto
                src={f.photoUrl}
                alt={`${f.name}님의 학습 인증 사진`}
              />
            ) : (
              f.photo && (
                <div className="photo-placeholder grid h-feed-photo place-items-center rounded-md">
                  <span className="text-caption text-muted">인증 사진</span>
                </div>
              )
            )}
            {f.body && (
              <span className="text-meta leading-normal">{f.body}</span>
            )}
            <div className="flex gap-2">
              <CheerButton
                name={f.name}
                feedIndex={i}
                label="축하"
                className="px-2.5 py-1"
              />
            </div>
          </div>
        </article>
      ))}
    </aside>
  );
}

/** 모바일 홈 — 미인증 멤버 콕 찌르기 + 축하 카드 (프로토타입) */
export function MobileSocialCards() {
  const lazy = lazyMember(useMembers());
  const feed = useStudyStore((s) => s.feed);
  const highlightIndex = feed.length > 1 ? 1 : 0;
  const highlight = feed[highlightIndex];

  return (
    <>
      {lazy && (
        <ActionCard
          className="px-3.5 py-3"
          leading={<HandPointing className="text-icon-md text-accent" />}
          title={`${lazy.name}님이 오늘 아직 인증하지 않았어요`}
          titleClassName="text-meta"
          action={
            <NudgeButton member={lazy} withIcon={false} className="text-meta" />
          }
        />
      )}
      {highlight && (
        <ActionCard
          className="px-3.5 py-3"
          leading={
            <span className="grid size-8 flex-none place-items-center rounded-full bg-accent-900">
              <Trophy />
            </span>
          }
          title={
            <>
              <b className="font-medium">{highlight.name}</b>님 {highlight.what}
            </>
          }
          titleClassName="text-meta"
          action={
            <CheerButton name={highlight.name} feedIndex={highlightIndex} />
          }
        />
      )}
    </>
  );
}
