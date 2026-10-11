"use client";

import { dDay } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import type { Member } from "@/types";

export function usePartySummary() {
  const party = useStudyStore((s) => s.party);
  const date = useStudyStore((s) => s.studyDate);
  const count = useStudyStore((s) => s.members.length);
  const days = party?.examDate
    ? dDay(new Date(`${date}T12:00:00`), new Date(`${party.examDate}T12:00:00`))
    : null;
  return {
    name: party?.name ?? "새벽 토익",
    dDay: days ?? "—",
    summary: `${count} / ${party?.capacity ?? 6}명${days === null ? "" : ` · D-${days}`}`,
  };
}
export function useMembers(): Member[] {
  const members = useStudyStore((s) => s.members);
  const mode = useStudyStore((s) => s.mode);
  const doneCount = useStudyStore(
    (s) => Object.values(s.done).filter(Boolean).length,
  );
  const latest = useStudyStore((s) => s.scores.at(-1)?.value ?? null);
  return mode === "live"
    ? members
    : members.map((m) =>
        m.isMe ? { ...m, quota: 78 + (doneCount - 2) * 5, score: latest } : m,
      );
}
export function isLazy(member: Member) {
  return !member.isMe && member.streak === 0;
}
export function lazyMember(members: Member[]) {
  return members.find(isLazy) ?? null;
}
export function memberLabel(member: Member) {
  return member.isMe ? `${member.name} (나)` : member.name;
}
export function bookPercent(member: Member) {
  return member.book.total
    ? Math.round((member.book.done / member.book.total) * 100)
    : 0;
}
