"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEVEL_CLASS } from "./tracker-data";
import { TrackerDayDetail } from "./tracker-day-detail";
import { useTrackerMonth } from "./use-tracker-month";

/** 데스크톱 트래커 — 멤버 × 날짜 히트맵 + 칸 상세 (웹 시안) */
export function TrackerBoard() {
  const { ym, month, memberIndex, dayIndex, detail, mode, select, move } =
    useTrackerMonth();

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
                  const selected = memberIndex === r && dayIndex === d;
                  return (
                    <button
                      key={c.day}
                      type="button"
                      disabled={c.future}
                      onClick={() => select(r, d)}
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

        <TrackerDayDetail
          detail={detail}
          live={mode === "live"}
          className="min-w-col-aside-min shrink basis-col-detail"
        />
      </div>
    </div>
  );
}
