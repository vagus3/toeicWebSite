"use client";

import { Fire } from "@phosphor-icons/react";
import { Avatar } from "@/components/shared/avatar";
import { PageTitle } from "@/components/shared/page-title";
import { ProgressBar } from "@/components/ui/progress-bar";
import { NudgeButton } from "@/features/party/party-buttons";
import { bookPercent, isLazy, memberLabel, useMembers } from "@/features/party/use-party";
import type { Member } from "@/types";

function StatRow({ label, value, display, barClassName }: { label: string; value: number; display: string; barClassName?: string }) {
  return (
    <>
      <span className="text-muted">{label}</span>
      <ProgressBar value={value} barClassName={barClassName} label={label} />
      <span>{display}</span>
    </>
  );
}

function MemberWeek({ member }: { member: Member }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <Avatar initial={member.initial} />
        <span className="flex-1 text-body">
          {memberLabel(member)} <span className="tag tag-neutral ml-1">{member.track}</span>
        </span>
        {isLazy(member) ? (
          <NudgeButton member={member} />
        ) : (
          <span className="flex items-center gap-1 text-label text-accent-300">
            <Fire weight="fill" /> {member.streak}일
          </span>
        )}
      </div>
      <div className="grid grid-cols-[var(--spacing-stat-label)_1fr_var(--spacing-stat-value)] items-center gap-x-2.5 gap-y-1.5 text-caption">
        <StatRow label="할당량" value={member.quota} display={`${member.quota}%`} />
        <StatRow label="교재" value={bookPercent(member)} display={`${member.book.done}/${member.book.total}`} barClassName="bg-accent-400" />
      </div>
    </section>
  );
}

/** 모바일 트래커 — 이번 주 멤버별 할당량·교재 진행 (프로토타입) */
export function TrackerWeek() {
  const members = useMembers();
  return (
    <div className="flex flex-col gap-4.5">
      <PageTitle>트래커 · 이번 주</PageTitle>
      {members.map((m) => (
        <MemberWeek key={m.id} member={m} />
      ))}
    </div>
  );
}
