"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEVEL_CLASS } from "./tracker-data";
import { TrackerDayDetail } from "./tracker-day-detail";
import { useTrackerMonth } from "./use-tracker-month";

/** 날짜 머리글은 칸이 좁아서 1·5·10·15·20·25·30일과 오늘만 숫자로 보여 준다 */
const LABELED_DAYS = new Set([1, 5, 10, 15, 20, 25, 30]);

/**
 * 모바일 월간 트래커 (보드 4b) — 멤버 × 날짜 잔디를 한 화면에 다 넣고, 아래에 고른 칸의 하루 상세.
 * 칸이 손가락보다 작아서, 상세 카드의 멤버 칩과 ‹ › 날짜 이동으로도 정확히 고를 수 있게 한다.
 */
export function TrackerMonthMobile() {
  const { ym, month, memberIndex, dayIndex, detail, mode, select, selectMember, step, move } =
    useTrackerMonth({ startOnMe: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => move(-1)}
          disabled={!month.canPrev}
          aria-label="이전 달"
        >
          <CaretLeft />
        </Button>
        <span className="flex flex-col items-center">
          <span className="text-title font-medium">
            {ym.year}년 {ym.month + 1}월
          </span>
          <span className="text-label text-muted">
            {month.isCurrent ? "이번 달" : "지난 기록"} · 평균 {month.average}
          </span>
        </span>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => move(1)}
          disabled={!month.canNext}
          aria-label="다음 달"
        >
          <CaretRight />
        </Button>
      </div>

      <div
        className="grid items-center gap-0.5 text-micro"
        // 날짜 수(28~31)는 달마다 달라서 inline style로 칸 수를 정한다
        style={{
          gridTemplateColumns: `var(--spacing-tracker-name-sm) repeat(${month.nDays}, minmax(0, 1fr))`,
        }}
      >
        <span />
        {month.rows[0]?.cells.map((c) => (
          <span
            key={c.day}
            aria-hidden
            className={cn(
              "text-center",
              c.day === month.todayDay ? "text-accent" : "text-neutral-500",
            )}
          >
            {LABELED_DAYS.has(c.day) || c.day === month.todayDay ? c.day : ""}
          </span>
        ))}
        {month.rows.map((row, r) => (
          <div key={row.member.id} className="contents">
            <span className="truncate pr-1 text-label">{row.member.name}</span>
            {row.cells.map((c, d) => {
              const selected = memberIndex === r && dayIndex === d;
              return (
                <button
                  key={c.day}
                  type="button"
                  disabled={c.future}
                  onClick={() => select(r, d)}
                  aria-label={`${row.member.name} ${ym.month + 1}월 ${c.day}일`}
                  aria-pressed={selected}
                  className={cn(
                    "aspect-square rounded-xs p-0",
                    c.future
                      ? "bg-transparent shadow-ring-divider"
                      : cn("cursor-pointer", LEVEL_CLASS[c.level]),
                    selected && "shadow-ring-selected",
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-caption text-muted">
        적음
        {LEVEL_CLASS.map((cls) => (
          <span key={cls} className={cn("size-2.5 rounded-xs", cls)} />
        ))}
        할당량 100%
      </div>

      <TrackerDayDetail
        detail={detail}
        live={mode === "live"}
        controls={
          <div className="flex flex-col gap-2.5">
            <div role="group" aria-label="멤버 고르기" className="flex flex-wrap gap-1.5">
              {month.rows.map((row, r) => (
                <button
                  key={row.member.id}
                  type="button"
                  aria-pressed={memberIndex === r}
                  onClick={() => selectMember(r)}
                  className={cn(
                    "tag cursor-pointer",
                    memberIndex === r ? "tag-accent" : "tag-outline",
                  )}
                >
                  {row.member.name}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                className="text-meta"
                onClick={() => step(-1)}
                disabled={dayIndex === 0}
              >
                <CaretLeft aria-hidden /> 전날
              </Button>
              <Button
                variant="ghost"
                className="text-meta"
                onClick={() => step(1)}
                disabled={dayIndex >= month.lastDay - 1}
              >
                다음 날 <CaretRight aria-hidden />
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
}
