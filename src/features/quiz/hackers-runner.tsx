"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/shared/page-title";
import { EvidencePhoto } from "@/features/study/evidence-photo";
import { DriveControls } from "@/features/study/drive-controls";
import { useStudyStore } from "@/stores/study-store";
import { ROUTES } from "@/lib/routes";
import { confirmedReportSchema, HACKERS_RC_URL, type HackersReport, type OcrReport, type ReportRow } from "./hackers-schema";

const INPUT = "w-full rounded-md border border-divider bg-surface p-2 text-body";
export function HackersRunner() {
  const partyId = useStudyStore((s) => s.party?.id);
  return <HackersReportFlow key={partyId ?? "none"} partyId={partyId} />;
}
function HackersReportFlow({ partyId }: { partyId: string | undefined }) {
  const mode = useStudyStore((s) => s.mode);
  const me = useStudyStore((s) => s.me);
  const today = useStudyStore((s) => s.studyDate);
  const refresh = useStudyStore((s) => s.refresh);
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  const [submissionId, setSubmissionId] = useState("");
  const [testDate, setTestDate] = useState(today);
  const [total, setTotal] = useState("");
  const [correct, setCorrect] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [method, setMethod] = useState<"ocr-reviewed" | "manual">("manual");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState<"file" | "read" | "save" | null>(null);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const reports = useQuery({
    queryKey: ["hackers-reports", partyId], enabled: mode === "live" && Boolean(partyId),
    queryFn: async (): Promise<{ reports: HackersReport[] }> => {
      const r = await fetch(`/api/quizzes/hackers?partyId=${encodeURIComponent(partyId!)}`, { cache: "no-store" });
      if (!r.ok) throw new Error("load_failed"); return r.json();
    },
  });
  async function selectFile(selected: File | undefined) {
    if (!selected || pending.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setMessage("PNG·JPG·WebP 채점표 이미지를 선택해 주세요."); return;
    }
    if (selected.size > 20 * 1024 * 1024) { setMessage("20MB 이하 이미지를 선택해 주세요."); return; }
    pending.current = true; setBusy("file"); setMessage("");
    try {
      const compressed = await imageCompression(selected, { maxSizeMB: 2.5, maxWidthOrHeight: 4000, initialQuality: 0.9, useWebWorker: true });
      if (compressed.size > 3 * 1024 * 1024) throw new Error("too_large");
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = URL.createObjectURL(compressed); setPreviewUrl(previewRef.current);
      setFile(compressed); setSubmissionId(crypto.randomUUID()); setReview(false); setRows([]); setTotal(""); setCorrect(""); setTestDate(today); setMethod("manual");
    } catch { setMessage("이미지를 준비하지 못했어요. 더 작은 PNG·JPG로 다시 선택해 주세요."); }
    finally { pending.current = false; setBusy(null); }
  }
  function formData() {
    const body = new FormData(); body.append("file", file!, file!.name); body.append("partyId", partyId!); return body;
  }
  async function read() {
    if (pending.current || !file || !partyId) return;
    pending.current = true; setBusy("read"); setMessage("");
    try {
      const res = await fetch("/api/quizzes/hackers/analyze", { method: "POST", body: formData() });
      if (!res.ok) throw new Error(res.status === 429 ? "rate_limited" : "read_failed");
      const data = await res.json() as OcrReport;
      if (!data.recognized) { setMessage("채점 결과를 찾지 못했어요. 결과 표가 보이게 다시 캡처하거나 직접 입력해 주세요."); return; }
      setTestDate(data.testDate ?? today); setTotal(data.total === null ? "" : String(data.total));
      setCorrect(data.correct === null ? "" : String(data.correct)); setRows(data.rows); setMethod("ocr-reviewed"); setReview(true);
      setMessage("읽은 값을 원본과 비교해 확인해 주세요. 날짜가 보이지 않으면 오늘 날짜로 표시되니 실제 문제 날짜로 수정해 주세요.");
    } catch (e) {
      setMessage(e instanceof Error && e.message === "rate_limited" ? "오늘 자동 읽기 요청이 많아요. 원본을 보고 직접 입력할 수 있어요."
        : "자동으로 읽지 못했어요. 다시 시도하거나 원본을 보고 직접 입력해 주세요.");
    } finally { pending.current = false; setBusy(null); }
  }
  function updateRow(index: number, patch: Partial<ReportRow>) {
    const updated = rows.map((r, i) => {
      if (i !== index) return r;
      const next = { ...r, ...patch };
      if (next.selected && next.correctAnswer) next.result = next.selected === next.correctAnswer ? "correct" : "incorrect";
      return next;
    });
    setRows(updated);
    if (updated.length === Number(total) && updated.every((r) => r.result !== "unknown")) setCorrect(String(updated.filter((r) => r.result === "correct").length));
  }
  async function save() {
    if (pending.current || !file || !partyId) return;
    const parsed = confirmedReportSchema.safeParse({ submissionId, partyId, testDate, total: total === "" ? null : Number(total), correct: correct === "" ? null : Number(correct), rows, method });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요."); return; }
    pending.current = true; setBusy("save"); setMessage("");
    try {
      const body = formData(); body.append("report", JSON.stringify(parsed.data));
      const res = await fetch("/api/quizzes/hackers", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (["drive_connection_required", "drive_reconnect_required"].includes(data.error)) throw new Error("drive_required");
        if (data.error === "future_test_date") throw new Error("future_date");
        throw new Error("save_failed");
      }
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null; setPreviewUrl(null);
      setFile(null); setReview(false); setRows([]); setTotal(""); setCorrect("");
      setMessage("채점표와 결과를 저장했어요. RC 인증도 완료됐어요.");
      const outcomes = await Promise.allSettled([refresh(), client.invalidateQueries({ queryKey: ["hackers-reports", partyId] })]);
      if (outcomes.some((r) => r.status === "rejected")) setMessage("결과는 저장됐어요. 목록이 갱신되지 않으면 새로고침해 주세요.");
    } catch (e) {
      setMessage(e instanceof Error && e.message === "drive_required" ? "내 Drive를 연결하거나 다시 연결한 뒤 저장해 주세요. 입력한 내용은 유지됩니다."
        : e instanceof Error && e.message === "future_date" ? "문제 날짜가 미래로 되어 있어요. 원본을 보고 수정해 주세요."
        : "저장하지 못했어요. 입력한 내용은 유지되니 다시 저장해 주세요.");
    } finally { pending.current = false; setBusy(null); }
  }
  return <div className="flex w-full max-w-3xl flex-col gap-5">
    <Link href={ROUTES.quizzes} className="text-meta text-muted">← 테스트 목록</Link>
    <PageTitle>해커스 일일 RC 제출</PageTitle>
    <ol className="m-0 list-decimal pl-5 text-body leading-reading"><li>해커스에서 문제를 풀고 채점하세요.</li><li>문제 날짜·정답 수·문항별 결과가 보이게 채점표만 캡처하세요.</li><li>이미지를 선택하고 읽은 내용을 확인한 뒤 저장하세요.</li></ol>
    <Button asChild variant="primary"><a href={HACKERS_RC_URL} target="_blank" rel="noopener noreferrer">해커스에서 풀고 채점하기 ↗</a></Button>
    <p className="text-meta text-muted">해커스 공식 연동이 아닌 제출자 확인 기록입니다. 현재 PNG·JPG·WebP 이미지를 지원합니다. 문제 원문·해설과 계정 정보는 제외하고 결과 표만 캡처해 주세요.</p>
    <DriveControls />
    <label className="card gap-2 p-4 text-body">채점표 이미지 선택<input type="file" accept="image/png,image/jpeg,image/webp" disabled={Boolean(busy) || mode !== "live" || !partyId} onChange={(e) => { void selectFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
    {busy === "file" && <p role="status">이미지 준비 중…</p>}
    {file && <section className="card gap-3 p-4">
      <strong className="break-all">선택한 파일: {file.name}</strong>
      {previewUrl && <details><summary className="cursor-pointer text-meta">선택한 원본 보기</summary>
        {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 선택한 로컬 이미지 미리보기 */}
        <img src={previewUrl} alt="선택한 채점표 원본" className="mt-2 max-h-[60dvh] w-full object-contain" />
      </details>}
      <p className="text-meta text-muted">자동 읽기를 누르면 이 이미지가 Groq로 전송됩니다. 저장 시 원본은 내 Drive에 저장되고 결과와 함께 같은 파티원에게 표시됩니다. 직접 입력하면 Groq에 보내지 않습니다.</p>
      <div className="flex flex-wrap gap-3"><Button variant="primary" disabled={Boolean(busy)} onClick={read}>{busy === "read" ? "채점표 읽는 중…" : "Groq로 채점표 읽기"}</Button><Button variant="secondary" disabled={Boolean(busy)} onClick={() => { setReview(true); setMethod("manual"); }}>원본 보고 직접 입력</Button></div>
    </section>}
    {message && <p role="status" className="text-meta text-accent-300">{message}</p>}
    {review && file && <section className="card gap-4 p-4">
      <strong>채점 결과 확인·수정</strong>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label>문제 날짜<input className={INPUT} type="date" value={testDate} max={today} disabled={Boolean(busy)} onChange={(e) => setTestDate(e.target.value)} /></label>
        <label>전체 문항 수<input className={INPUT} type="number" min={1} max={200} value={total} disabled={Boolean(busy)} onChange={(e) => setTotal(e.target.value)} /></label>
        <label>정답 수<input className={INPUT} type="number" min={0} max={Number(total) || 200} value={correct} disabled={Boolean(busy)} onChange={(e) => setCorrect(e.target.value)} /></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left text-meta"><thead><tr><th>번호</th><th>내 답</th><th>정답</th><th>정오</th><th>삭제</th></tr></thead><tbody>{rows.map((row, i) => <tr key={i}>
        <td><input aria-label={`${i + 1}행 문항 번호`} className={INPUT} type="number" min={1} max={200} value={row.number} disabled={Boolean(busy)} onChange={(e) => updateRow(i, { number: Number(e.target.value) })} /></td>
        {(["selected", "correctAnswer"] as const).map((field) => <td key={field}><select aria-label={`${row.number}번 ${field === "selected" ? "내 답" : "정답"}`} className={INPUT} value={row[field] ?? ""} disabled={Boolean(busy)} onChange={(e) => updateRow(i, { [field]: e.target.value || null } as Partial<ReportRow>)}><option value="">확인 필요</option>{["A","B","C","D"].map((v) => <option key={v}>{v}</option>)}</select></td>)}
        <td><select aria-label={`${row.number}번 정오`} className={INPUT} value={row.result} disabled={Boolean(busy) || Boolean(row.selected && row.correctAnswer)} onChange={(e) => updateRow(i, { result: e.target.value as ReportRow["result"] })}><option value="unknown">확인 필요</option><option value="correct">O</option><option value="incorrect">X</option></select></td>
        <td><Button variant="ghost" disabled={Boolean(busy)} onClick={() => setRows(rows.filter((_, j) => j !== i))}>삭제</Button></td>
      </tr>)}</tbody></table></div>
      {!rows.length && <p className="text-meta text-muted">문항별 결과를 읽지 못했거나 합계만 있는 채점표입니다. 필요한 경우 문항을 추가할 수 있어요.</p>}
      <Button variant="secondary" disabled={Boolean(busy) || rows.length >= 200} onClick={() => setRows([...rows, { number: Array.from({ length: 200 }, (_, i) => i + 1).find((n) => !rows.some((r) => r.number === n)) ?? 1, selected: null, correctAnswer: null, result: "unknown" }])}>문항 추가</Button>
      <p className="text-meta text-muted">인식 결과를 원본과 비교해 주세요. 정답 수·문항 수는 필수이며, 문항별 정보가 없으면 합계만 저장합니다. AI 인식은 해커스의 공식 결과 검증을 의미하지 않습니다.</p>
      <Button variant="primary" disabled={Boolean(busy)} onClick={save}>{busy === "save" ? "Drive와 결과 저장 중…" : "확인한 결과 저장 · RC 인증"}</Button>
    </section>}
    <h2 className="text-title">파티 제출 기록</h2>
    {mode !== "live" ? <p>파티에 로그인하면 채점표를 제출할 수 있어요.</p> : reports.isPending ? <p role="status">기록 불러오는 중…</p> : reports.isError ? <Button variant="secondary" onClick={() => reports.refetch()}>기록 다시 불러오기</Button> : <>
      {!reports.data?.reports.length && <p className="text-meta text-muted">아직 제출한 채점표가 없어요.</p>}
      {reports.data?.reports.map((r) => <details key={r.id} className="card p-4"><summary className="cursor-pointer text-body">{r.test_date} · {r.user_id === me.id ? me.name : r.profiles?.nickname ?? "파티원"} · {r.correct}/{r.total} 정답 ({Math.round(r.correct / r.total * 100)}%)</summary><div className="mt-3 flex flex-col gap-3">
        <span className="text-meta text-muted">제출자 확인 · {r.method === "manual" ? "직접 입력" : "자동 인식 후 확인"}</span>
        <div className="overflow-x-auto"><table className="w-full text-left text-meta"><thead><tr><th>번호</th><th>내 답</th><th>정답</th><th>결과</th></tr></thead><tbody>{r.rows.map((row) => <tr key={row.number}><td>{row.number}</td><td>{row.selected ?? "—"}</td><td>{row.correctAnswer ?? "—"}</td><td>{row.result === "correct" ? "O" : row.result === "incorrect" ? "X" : "확인 필요"}</td></tr>)}</tbody></table></div>
        {!r.rows.length && <p className="text-meta text-muted">문항별 정보 없이 합계만 제출된 기록입니다.</p>}
        <EvidencePhoto src={`/api/study/evidence/${r.study_log_id}`} alt={`${r.test_date} 해커스 채점표`} />
      </div></details>)}
    </>}
  </div>;
}
