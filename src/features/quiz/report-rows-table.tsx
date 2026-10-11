import type { ReportRow } from "./hackers-schema";

const RESULT_LABEL = { correct: "O", incorrect: "X", unknown: "확인 필요" } as const;

/** 저장된 해커스 채점표의 문항별 결과 (읽기 전용) */
export function ReportRowsTable({ rows }: { rows: ReportRow[] }) {
  if (!rows.length)
    return (
      <p className="text-meta text-muted">
        문항별 정보 없이 합계만 제출된 기록입니다.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-meta">
        <thead>
          <tr>
            <th>번호</th>
            <th>내 답</th>
            <th>정답</th>
            <th>결과</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.number}>
              <td>{row.number}</td>
              <td>{row.selected ?? "—"}</td>
              <td>{row.correctAnswer ?? "—"}</td>
              <td>{RESULT_LABEL[row.result]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
