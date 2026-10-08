"use client";

import Link from "next/link";
import { SectionTitle } from "@/components/shared/section-title";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ROUTES } from "@/lib/routes";
import { NudgeButton } from "./party-buttons";
import { isLazy, memberLabel, useMembers } from "./use-party";

const COLUMNS = ["멤버", "트랙", "할당량", "교재", "최근 점수", "연속"];

/** 홈 — 이번 주 파티 표 */
export function MembersTable() {
  const members = useMembers();

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <SectionTitle>이번 주 파티</SectionTitle>
        <Button asChild variant="ghost" className="text-meta">
          <Link href={ROUTES.tracker}>트래커 전체 보기</Link>
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="ds-table min-w-table-min">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th>
                <span className="sr-only">콕 찌르기</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{memberLabel(m)}</td>
                <td>{m.track}</td>
                <td>
                  <span className="flex items-center gap-2">
                    <ProgressBar value={m.quota} className="w-16" label={`${m.name} 할당량`} />
                    {m.quota}%
                  </span>
                </td>
                <td>
                  {m.book.done}/{m.book.total}
                </td>
                <td>{m.score ?? "—"}</td>
                <td>{m.streak}일</td>
                <td className="text-right">{isLazy(m) && <NudgeButton member={m} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
