"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReportRow } from "./hackers-schema";

const CHOICES = ["A", "B", "C", "D"] as const;
type Choice = ReportRow["selected"];
type Result = ReportRow["result"];
const RESULTS: { value: Result; label: string }[] = [
  { value: "correct", label: "O" },
  { value: "incorrect", label: "X" },
  { value: "unknown", label: "확인 필요" },
];
const RESULT_TAG = {
  correct: { label: "O 정답", tone: "tag-accent" },
  incorrect: { label: "X 오답", tone: "tag-neutral" },
  unknown: { label: "확인 필요", tone: "text-muted shadow-ring-divider" },
} as const;

/** 손가락으로 누르기 좋은 크기(44px)의 고르기 버튼 */
const OPTION = "grid h-control-lg min-w-control-lg place-items-center rounded-md px-2 text-body";
const optionTone = (selected: boolean) =>
  selected ? "bg-accent-soft shadow-ring-accent" : "shadow-sm";

/** 내 답·정답 — A–D 중 하나. 고른 글자를 다시 누르면 비워서 "확인 필요"로 돌린다 */
function LetterRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: Choice;
  disabled: boolean;
  onChange: (next: Choice) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-label text-muted">{label}</span>
      {CHOICES.map((letter) => (
        <button
          key={letter}
          type="button"
          role="radio"
          aria-checked={value === letter}
          disabled={disabled}
          onClick={() => onChange(value === letter ? null : letter)}
          className={cn(OPTION, optionTone(value === letter))}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}

/** 정오 — 내 답·정답이 비어 있을 때만 직접 고른다 */
function ResultRow({
  value,
  disabled,
  onChange,
}: {
  value: Result;
  disabled: boolean;
  onChange: (next: Result) => void;
}) {
  return (
    <div role="radiogroup" aria-label="정오" className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-label text-muted">정오</span>
      {RESULTS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(OPTION, optionTone(value === option.value))}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 채점 결과 확인·수정 (모바일) — 문항마다 카드 하나. 내 답·정답을 A–D 버튼으로 고른다.
 * 데스크톱은 기존 표를 쓴다. 값 계산(정오 자동 판정·정답 수)은 부모의 onChange(updateRow)가 한다.
 */
export function ReportRowEditorList({
  rows,
  disabled,
  onChange,
  onRemove,
}: {
  rows: ReportRow[];
  disabled: boolean;
  onChange: (index: number, patch: Partial<ReportRow>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <ul aria-label="문항별 결과 수정" className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((row, i) => {
        const tag = RESULT_TAG[row.result];
        return (
          <li key={i} className="card gap-2.5 p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-meta">
                번호
                <input
                  aria-label={`${i + 1}행 문항 번호`}
                  className="input w-20"
                  type="number"
                  min={1}
                  max={200}
                  value={row.number}
                  disabled={disabled}
                  onChange={(e) => onChange(i, { number: Number(e.target.value) })}
                />
              </label>
              <span className={cn("tag ml-auto", tag.tone)}>{tag.label}</span>
              <Button
                variant="ghost"
                className="text-meta"
                disabled={disabled}
                onClick={() => onRemove(i)}
              >
                삭제
              </Button>
            </div>
            <LetterRow
              label="내 답"
              value={row.selected}
              disabled={disabled}
              onChange={(next) => onChange(i, { selected: next })}
            />
            <LetterRow
              label="정답"
              value={row.correctAnswer}
              disabled={disabled}
              onChange={(next) => onChange(i, { correctAnswer: next })}
            />
            {/* 내 답·정답이 다 있으면 정오는 자동으로 정해진다 */}
            {!(row.selected && row.correctAnswer) && (
              <ResultRow
                value={row.result}
                disabled={disabled}
                onChange={(next) => onChange(i, { result: next })}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
