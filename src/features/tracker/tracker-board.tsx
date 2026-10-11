"use client";

import {
  BookmarkSimple,
  BookOpen,
  CaretLeft,
  CaretRight,
  Headphones,
  TextAa,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useStudyStore } from "@/stores/study-store";
import { cn } from "@/lib/utils";
import { TASKS } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { CheerButton, NudgeButton } from "@/features/party/party-buttons";
import { EvidencePhoto, evidenceUrl } from "@/features/study/evidence-photo";
import {
  buildMonth,
  dayDetail,
  LEVEL_CLASS,
  shiftMonth,
  type TrackerMonth,
} from "./tracker-data";

/** 데스크톱 트래커 — 멤버 × 날짜 히트맵 + 칸 상세 (웹 시안) */
export function TrackerBoard() {
  const members = useStudyStore((s) => s.members);
  const logs = useStudyStore((s) => s.logs);
  const studyDate = useStudyStore((s) => s.studyDate);
  const party = useStudyStore((s) => s.party);
  const mode = useStudyStore((s) => s.mode);
  const today = new Date(`${studyDate}T12:00:00`);
  const source = {
    members,
    logs,
    studyDate,
    startDate: party?.createdAt ?? studyDate,
    mode,
  };
  const [ym, setYm] = useState<TrackerMonth>({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [cell, setCell] = useState<[number, number]>([0, today.getDate() - 1]);
  const month = buildMonth(ym, source);
  const dayIndex = Math.min(cell[1], month.lastDay - 1);
  const detail = dayDetail(cell[0], ym, dayIndex, source);

  const move = (delta: number) => {
    setYm((cur) => shiftMonth(cur, delta));
    setCell(([r]) => [r, 0]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => move(-1)}
            disabled={!month.canPrev}
            title="이전 달"
            aria-label="이전 달"
          >
            <CaretLeft />
          </Button>
          <h1 className="m-0 min-w-month-label text-center text-h3">
            트래커 · {ym.year}년 {ym.month + 1}월
          </h1>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => move(1)}
            disabled={!month.canNext}
            title="다음 달"
            aria-label="다음 달"
          >
            <CaretRight />
          </Button>
          {!month.isCurrent && (
            <span className="tag tag-neutral">지난 기록</span>
          )}
        </div>
        <span className="text-meta text-muted">
          칸을 누르면 그날 뭐 했는지 보여요 · 이번 달 평균 {month.average}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <div className="min-w-0 flex-1 basis-col-tracker overflow-x-auto">
          <div
            className="grid min-w-grid-min items-center gap-1 text-label"
            style={{
              gridTemplateColumns: `var(--spacing-tracker-name) repeat(${month.nDays}, minmax(var(--spacing-tracker-cell), 1fr))`,
            }}
          >
            <span />
            {month.rows[0].cells.map((c) => (
              <span
                key={c.day}
                className={cn(
                  "text-center text-micro",
                  c.day === month.todayDay ? "text-accent" : "text-neutral-500",
                )}
              >
                {c.day}
              </span>
            ))}
            {month.rows.map((row, r) => (
              <div key={row.member.id} className="contents">
                <span>{row.member.name}</span>
                {row.cells.map((c, d) => {
                  const selected = cell[0] === r && dayIndex === d;
                  return (
                    <button
                      key={c.day}
                      type="button"
                      disabled={c.future}
                      onClick={() => setCell([r, d])}
                      title={`${row.member.name} ${ym.month + 1}/${c.day}${c.future ? " (예정)" : ""}`}
                      aria-label={`${row.member.name} ${ym.month + 1}월 ${c.day}일`}
                      aria-pressed={selected}
                      className={cn(
                        "aspect-square rounded-sm p-0",
                        c.future
                          ? "cursor-default bg-transparent shadow-ring-divider"
                          : cn("cursor-pointer", LEVEL_CLASS[c.level]),
                        selected && "shadow-ring-selected",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-caption text-muted">
            적음
            {LEVEL_CLASS.map((cls) => (
              <span key={cls} className={cn("size-2.5 rounded-xs", cls)} />
            ))}
            할당량 100%
          </div>
        </div>

        <div className="card elev-sm min-w-col-aside-min shrink basis-col-detail gap-3.5 p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-title font-medium">{detail.title}</span>
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
            <NudgeButton member={detail.member} variant="secondary" />
            {mode === "live" && (
              <Button asChild variant="ghost" className="text-meta">
                <Link href={`${ROUTES.records}?memberId=${detail.member.id}&month=${detail.month}`}>
                  기록에서 보기
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
