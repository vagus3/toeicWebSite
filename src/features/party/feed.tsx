"use client";

import { HandPointing, Trophy } from "@phosphor-icons/react";
import { ActionCard } from "@/components/shared/action-card";
import { Avatar } from "@/components/shared/avatar";
import { SectionTitle } from "@/components/shared/section-title";
import { FEED } from "@/lib/demo-data";
import { CheerButton, NudgeButton } from "./party-buttons";
import { lazyMember, useMembers } from "./use-party";

/** 데스크톱 홈 우측 — 파티 피드 */
export function Feed() {
  return (
    <aside className="flex min-w-col-aside-min shrink basis-col-aside flex-col gap-5">
      <SectionTitle>피드</SectionTitle>
      {FEED.map((f, i) => (
        <article key={f.id} className="flex gap-2.5">
          <Avatar initial={f.initial} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-meta">
              <b className="font-medium">{f.name}</b> <span className="text-muted">{f.what}</span>
            </span>
            {f.photo && (
              <div className="photo-placeholder grid h-feed-photo place-items-center rounded-md">
                <span className="text-caption text-muted">인증 사진</span>
              </div>
            )}
            {f.body && <span className="text-meta leading-normal">{f.body}</span>}
            <div className="flex gap-2">
              <CheerButton name={f.name} feedIndex={i} label="축하" className="px-2.5 py-1" />
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
  const highlightIndex = 1;
  const highlight = FEED[highlightIndex];

  return (
    <>
      {lazy && (
        <ActionCard
          className="px-3.5 py-3"
          leading={<HandPointing className="text-icon-md text-accent" />}
          title={`${lazy.name}님이 2일째 미인증이에요`}
          titleClassName="text-meta"
          action={<NudgeButton member={lazy} withIcon={false} className="text-meta" />}
        />
      )}
      <ActionCard
        className="px-3.5 py-3"
        leading={
          <span className="grid size-8 flex-none place-items-center rounded-full bg-accent-900">
            <Trophy />
          </span>
        }
        title={
          <>
            <b className="font-medium">{highlight.name}</b>님 주간 테스트{" "}
            <span className="text-accent-300">+45점</span>
          </>
        }
        titleClassName="text-meta"
        action={<CheerButton name={highlight.name} feedIndex={highlightIndex} />}
      />
    </>
  );
}
