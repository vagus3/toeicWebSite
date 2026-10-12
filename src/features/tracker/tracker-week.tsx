"use client";

import { Fire } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/shared/avatar";
import { PageTitle } from "@/components/shared/page-title";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ROUTES } from "@/lib/routes";
import { NudgeButton } from "@/features/party/party-buttons";
import { bookPercent, isLazy, memberLabel, useMembers } from "@/features/party/use-party";
import type { Member } from "@/types";
import { TrackerMonthMobile } from "./tracker-month-mobile";

function StatRow({
  label,
  value,
  display,
  barClassName,
}: {
  label: string;
  value: number;
  display: string;
  barClassName?: string;
}) {
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
        <StatRow
          label="교재"
          value={bookPercent(member)}
          display={member.book.total ? `${member.book.done}/${member.book.total}` : `${member.book.done}일`}
          barClassName="bg-accent-400"
        />
      </div>
    </section>
  );
}

/** 이번 주 멤버별 할당량·교재 진행 (보드 4a) */
export function TrackerWeek() {
  const members = useMembers();
  return (
    <div className="flex flex-col gap-4.5">
      {members.map((m) => (
        <MemberWeek key={m.id} member={m} />
      ))}
    </div>
  );
}

type View = "week" | "month";
const VIEWS: { value: View; label: string }[] = [
  { value: "week", label: "이번 주" },
  { value: "month", label: "월간" },
];

/** 모바일 트래커 — [이번 주 | 월간] 전환. 월간은 잔디 + 하루 상세 (보드 4b) */
export function TrackerMobile() {
  const [view, setView] = useState<View>("week");
  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex items-center justify-between gap-3">
        <PageTitle>트래커</PageTitle>
        <Link href={ROUTES.records} className="text-meta text-accent underline">
          인증 기록 보기
        </Link>
      </div>
      <div role="radiogroup" aria-label="트래커 보기" className="seg self-start">
        {VIEWS.map((option) => (
          <label key={option.value} className="seg-opt">
            <input
              type="radio"
              name="tracker-view"
              value={option.value}
              checked={view === option.value}
              onChange={() => setView(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {view === "week" ? <TrackerWeek /> : <TrackerMonthMobile />}
    </div>
  );
}
