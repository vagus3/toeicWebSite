import { cn } from "@/lib/utils";
import type { ReportRow } from "./hackers-schema";
import { ReportRowsTable } from "./report-rows-table";

const MARK = { correct: "✓", incorrect: "✗", unknown: "?" } as const;
const TONE = {
  correct: "tag-accent",
  incorrect: "tag-neutral",
  unknown: "text-muted shadow-ring-divider",
} as const;

function describe(row: ReportRow) {
  if (row.result === "correct") return `${row.number}번 정답`;
  if (row.result === "unknown") return `${row.number}번 확인 필요`;
  return `${row.number}번 오답, 내 답 ${row.selected ?? "없음"}, 정답 ${row.correctAnswer ?? "모름"}`;
}

/**
 * 해커스 채점표 문항 결과 — 모바일용 번호 칩. 200문항 표 대신 한눈에 훑게 하고,
 * 오답은 "내 답→정답"을 같이 보여 준다.
 */
export function ReportRowsGrid({ rows }: { rows: ReportRow[] }) {
  if (!rows.length)
    return (
      <p className="m-0 text-meta text-muted">문항별 정보 없이 합계만 제출된 기록입니다.</p>
    );
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="문항별 결과" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {rows.map((row) => (
          <li key={row.number} aria-label={describe(row)} className={cn("tag", TONE[row.result])}>
            {row.number} {MARK[row.result]}
            {row.result === "incorrect" &&
              row.selected &&
              row.correctAnswer &&
              ` ${row.selected}→${row.correctAnswer}`}
          </li>
        ))}
      </ul>
      <p className="m-0 text-caption text-muted">✓ 정답 · ✗ 오답(내 답→정답) · ? 확인 필요</p>
    </div>
  );
}

/** 문항별 결과 — 모바일은 칩, 데스크톱은 표 */
export function ReportRowsView({ rows }: { rows: ReportRow[] }) {
  return (
    <>
      <div className="md:hidden">
        <ReportRowsGrid rows={rows} />
      </div>
      <div className="hidden md:block">
        <ReportRowsTable rows={rows} />
      </div>
    </>
  );
}
