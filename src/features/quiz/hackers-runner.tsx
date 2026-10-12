"use client";

import { X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";
import { FilePickerButton } from "@/components/shared/file-picker-button";
import { PinnedFooter } from "@/components/shared/pinned-footer";
import { ScreenHeader } from "@/components/shared/screen-header";
import { EvidencePhoto, evidenceUrl } from "@/features/study/evidence-photo";
import { reviewQueryKey } from "@/features/review/use-review";
import { DriveBanner } from "@/features/study/drive-banner";
import { ReportRowEditorList } from "./report-row-editor";
import { ReportRowsView } from "./report-rows-grid";
import { useStudyStore } from "@/stores/study-store";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { confirmedReportSchema, hasChoiceAnswers, HACKERS_LABELS, HACKERS_URLS, MAX_REPORT_PAGES, type HackersCategory, type HackersReport, type OcrReport, type ReportRow } from "./hackers-schema";
import { CAPTURE_COMPRESSION, isPdf, MAX_PAGE_BYTES, prepareReportImages, reportFileErrorMessage, stitchImages } from "./pdf-to-image";

const INPUT = "w-full rounded-md border border-divider bg-surface p-2 text-body";
const ACCEPT = "application/pdf,.pdf,image/png,image/jpeg,image/webp";
/** 하단 고정 버튼 — 모바일은 크게 꽉 차게, 데스크톱은 보통 크기 (세로 flex라 self-start로 늘어나지 않게) */
const BIG = "h-control-xl w-full text-base md:h-control-lg md:w-auto md:self-start md:px-6 md:text-body";
const STEPS = ["결과지 받기", "파일 확인", "결과 확인·저장"] as const;

/** 단계 표시 — 지금 단계까지 accent, 남은 단계는 흐리게 */
function StepTrail({ step }: { step: number }) {
  return (
    <ol aria-label="제출 단계" className="m-0 flex list-none gap-1.5 p-0 text-label">
      {STEPS.map((name, i) => (
        <li
          key={name}
          aria-current={step === i + 1 ? "step" : undefined}
          className={cn(
            "flex flex-1 flex-col gap-1",
            i + 1 <= step ? "text-accent-300" : "text-muted",
          )}
        >
          <span className={cn("h-0.75 rounded-full", i + 1 <= step ? "bg-accent" : "bg-neutral-800")} />
          {name}
        </li>
      ))}
    </ol>
  );
}
export function HackersRunner({ category = "rc" }: { category?: HackersCategory }) {
  const partyId = useStudyStore((s) => s.party?.id);
  return <HackersReportFlow key={`${partyId ?? "none"}:${category}`} partyId={partyId} category={category} />;
}
function HackersReportFlow({ partyId, category }: { partyId: string | undefined; category: HackersCategory }) {
  const label = HACKERS_LABELS[category];
  const isWord = category === "word";
  const mode = useStudyStore((s) => s.mode);
  const canSubmit = mode === "live" && Boolean(partyId);
  const me = useStudyStore((s) => s.me);
  const today = useStudyStore((s) => s.studyDate);
  const refresh = useStudyStore((s) => s.refresh);
  const client = useQueryClient();
  // 캡처는 한 장, 결과지 PDF는 쪽마다 한 장. keep은 Drive 증빙으로 남길 쪽 번호(1부터)다.
  const [pages, setPages] = useState<File[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [fromPdf, setFromPdf] = useState(false);
  const [keep, setKeep] = useState<number[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const previewRef = useRef<string[]>([]);
  const replacePreviews = (urls: string[]) => {
    previewRef.current.forEach((u) => URL.revokeObjectURL(u));
    previewRef.current = urls; setPreviewUrls(urls);
  };
  useEffect(() => () => previewRef.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const [submissionId, setSubmissionId] = useState("");
  const [testDate, setTestDate] = useState(today);
  const [total, setTotal] = useState("");
  const [correct, setCorrect] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [method, setMethod] = useState<"ocr-reviewed" | "manual">("manual");
  const [busy, setBusy] = useState<"file" | "read" | "save" | null>(null);
  const [message, setMessage] = useState("");
  const [review, setReview] = useState(false);
  const pending = useRef(false);
  const reports = useQuery({
    queryKey: ["hackers-reports", partyId, category], enabled: mode === "live" && Boolean(partyId),
    queryFn: async (): Promise<{ reports: HackersReport[] }> => {
      const r = await fetch(`/api/quizzes/hackers?partyId=${encodeURIComponent(partyId!)}&category=${category}`, { cache: "no-store" });
      if (!r.ok) throw new Error("load_failed"); return r.json();
    },
  });
  async function selectFile(selected: File | undefined) {
    if (!selected || pending.current) return;
    const pdf = isPdf(selected);
    if (!pdf && !["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setMessage("PDF 또는 PNG·JPG·WebP 채점표를 선택해 주세요."); return;
    }
    if (selected.size > 20 * 1024 * 1024) { setMessage("20MB 이하 파일을 선택해 주세요."); return; }
    pending.current = true; setBusy("file"); setMessage("");
    try {
      // PDF는 브라우저에서 쪽별 이미지로 바꾼 뒤 기존 이미지 흐름(읽기·Drive 저장)을 탄다
      const { pages: compressed } = await prepareReportImages(selected);
      replacePreviews(compressed.map((f) => URL.createObjectURL(f)));
      setPages(compressed); setSourceName(selected.name); setFromPdf(pdf); setKeep(pdf ? [] : [1]);
      setSubmissionId(crypto.randomUUID()); setRows([]); setTotal(""); setCorrect(""); setTestDate(today); setMethod("manual"); setReview(false);
    } catch (e) { setMessage(reportFileErrorMessage(e)); }
    finally { pending.current = false; setBusy(null); }
  }
  function formData(files: File[]) {
    const body = new FormData(); files.forEach((f) => body.append("file", f, f.name)); body.append("partyId", partyId!); body.append("category", category); return body;
  }
  /** 증빙은 고른 쪽만 남긴다. 여러 쪽이면 세로로 이어 붙여 한 장으로 저장한다. */
  async function evidenceFile() {
    const chosen = pages.filter((_, i) => keep.includes(i + 1));
    if (chosen.length <= 1) return chosen[0] ?? null;
    const stitched = await stitchImages(chosen, `${sourceName.replace(/\.pdf$/i, "")}-result.png`);
    return imageCompression(stitched, { ...CAPTURE_COMPRESSION, fileType: "image/jpeg" });
  }
  async function read() {
    if (pending.current || !pages.length || !partyId || !canSubmit) return;
    pending.current = true; setBusy("read"); setMessage("");
    try {
      const res = await fetch("/api/quizzes/hackers/analyze", { method: "POST", body: formData(pages) });
      if (!res.ok) throw new Error(res.status === 429 ? "rate_limited" : "read_failed");
      const data = await res.json() as OcrReport;
      if (!data.recognized) { setMessage(fromPdf ? "PDF에서 채점 결과를 찾지 못했어요. 결과 표를 캡처하거나 직접 입력해 주세요." : "채점 결과를 찾지 못했어요. 결과 표가 보이게 다시 캡처하거나 직접 입력해 주세요."); return; }
      setTestDate(data.testDate ?? today); setTotal(data.total === null ? "" : String(data.total));
      setCorrect(data.correct === null ? "" : String(data.correct)); setRows(data.rows); setMethod("ocr-reviewed"); setReview(true);
      if (fromPdf) setKeep(data.pages);
      setMessage(fromPdf && !data.pages.length
        ? "결과표가 있는 쪽을 찾지 못했어요. 아래에서 Drive에 저장할 쪽을 골라 주세요."
        : "읽은 값을 원본과 비교해 확인해 주세요. 날짜가 보이지 않으면 오늘 날짜로 표시되니 실제 문제 날짜로 수정해 주세요.");
    } catch (e) {
      setMessage(e instanceof Error && e.message === "rate_limited" ? "오늘 자동 읽기 요청이 많아요. 원본을 보고 직접 입력할 수 있어요."
        : "자동으로 읽지 못했어요. 다시 시도하거나 원본을 보고 직접 입력해 주세요.");
    } finally { pending.current = false; setBusy(null); }
  }
  function updateRow(index: number, patch: Partial<ReportRow>) {
    const updated = rows.map((r, i) => {
      if (i !== index) return r;
      const next = { ...r, ...patch };
      if (hasChoiceAnswers(next)) next.result = next.selected === next.correctAnswer ? "correct" : "incorrect";
      return next;
    });
    setRows(updated);
    if (updated.length === Number(total) && updated.every((r) => r.result !== "unknown")) setCorrect(String(updated.filter((r) => r.result === "correct").length));
  }
  async function save() {
    if (pending.current || !pages.length || !partyId || !canSubmit) return;
    const parsed = confirmedReportSchema.safeParse({ submissionId, partyId, category, testDate, total: total === "" ? null : Number(total), correct: correct === "" ? null : Number(correct), rows, method });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요."); return; }
    if (!keep.length) { setMessage("Drive에 저장할 결과표 쪽을 하나 이상 골라 주세요."); return; }
    pending.current = true; setBusy("save"); setMessage("");
    try {
      const evidence = await evidenceFile();
      if (!evidence || evidence.size > MAX_PAGE_BYTES) throw new Error("save_failed");
      const body = formData([evidence]); body.append("report", JSON.stringify(parsed.data));
      const res = await fetch("/api/quizzes/hackers", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (["drive_connection_required", "drive_reconnect_required"].includes(data.error)) throw new Error("drive_required");
        if (data.error === "future_test_date") throw new Error("future_date");
        throw new Error("save_failed");
      }
      replacePreviews([]);
      setPages([]); setKeep([]); setRows([]); setTotal(""); setCorrect("");
      setMessage(`채점표와 결과를 저장했어요. ${label} 인증도 완료됐어요.`);
      const outcomes = await Promise.allSettled([refresh(), client.invalidateQueries({ queryKey: ["hackers-reports", partyId, category] }), client.invalidateQueries({ queryKey: reviewQueryKey(partyId) }), client.invalidateQueries({ queryKey: ["records", partyId] })]);
      if (outcomes.some((r) => r.status === "rejected")) setMessage("결과는 저장됐어요. 목록이 갱신되지 않으면 새로고침해 주세요.");
    } catch (e) {
      setMessage(e instanceof Error && e.message === "drive_required" ? "내 Drive를 연결하거나 다시 연결한 뒤 저장해 주세요. 입력한 내용은 유지됩니다."
        : e instanceof Error && e.message === "future_date" ? "문제 날짜가 미래로 되어 있어요. 원본을 보고 수정해 주세요."
        : "저장하지 못했어요. 입력한 내용은 유지되니 다시 저장해 주세요.");
    } finally { pending.current = false; setBusy(null); }
  }
  // 1 결과지 받기 → 2 파일 확인(쪽 고르기·자동 읽기) → 3 결과 확인·저장
  const step = review && pages.length > 0 ? 3 : pages.length > 0 ? 2 : 1;
  return <div className="flex w-full max-w-3xl flex-1 flex-col gap-5">
    <ScreenHeader
      leading={{ href: ROUTES.quizzes, label: "테스트로 돌아가기", icon: X }}
      title={`해커스 ${label} 채점표 제출`}
      trailing={`${step}/3`}
      below={<StepTrail step={step} />}
    />
    {message && <p role="status" className="m-0 text-meta text-accent-300">{message}</p>}
    {step === 1 && <section aria-label="결과지 받기" className="flex flex-col gap-3">
      <ol className="m-0 list-decimal pl-5 text-body leading-reading"><li>{isWord ? "해커스 단어시험지 생성기에서 교재·Day 범위·문항 수·문제 유형을 선택해 시험지를 만들고 응시·채점하세요." : "해커스에서 문제를 풀고 채점하세요."}</li><li>{isWord ? "응시 날짜·정답 수·정오가 보이는 결과 화면이나 직접 채점한 시험지를 PDF·스크린샷으로 준비하세요." : "문제 날짜·정답 수·문항별 결과가 보이게 채점표만 캡처하거나 결과지 PDF를 내려받으세요."}</li><li>아래에서 파일을 고르고 읽은 내용을 확인한 뒤 저장하세요.</li></ol>
      <Button asChild variant="secondary" className="self-start"><a href={HACKERS_URLS[category]} target="_blank" rel="noopener noreferrer">해커스 {label} 풀고 채점하기 ↗</a></Button>
      <details className="text-meta text-muted"><summary className="cursor-pointer">제출 전에 알아 두세요</summary>
        <p className="m-0 mt-1.5 leading-reading">해커스 공식 연동이 아닌 제출자 확인 기록입니다. 결과지 PDF({MAX_REPORT_PAGES}쪽 이하)와 PNG·JPG·WebP 캡처를 지원합니다. PDF는 이 기기에서 쪽별 이미지로 바꾸고, 결과표가 있는 쪽만 Drive에 저장합니다. 캡처할 때는 문제 원문·해설과 계정 정보를 빼고 결과 표만 담아 주세요.</p>
      </details>
      <DriveBanner inline />
      {!canSubmit && <p className="m-0 text-meta text-muted">{mode === "demo" ? "데모 모드에서는 파일 선택·결과 입력·제출이 비활성화되어 있어요. 로그인 후 파티에 참가하고 내 Drive를 연결하면 제출할 수 있어요." : "파티에 참가하면 채점표를 제출할 수 있어요."}</p>}
    </section>}
    {pages.length > 0 && <section className="card gap-3 p-4">
      <strong className="break-all">선택한 파일: {sourceName}{fromPdf && ` · ${pages.length}쪽`}</strong>
      {fromPdf ? <fieldset className="flex flex-col gap-2" disabled={Boolean(busy)}>
        <legend className="text-meta text-muted">Drive에 저장할 결과표 쪽 {keep.length ? `· ${keep.join(", ")}쪽 선택됨` : "· Groq로 읽으면 자동으로 골라요"}</legend>
        {previewUrls.map((url, i) => <div key={url} className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-meta"><input type="checkbox" checked={keep.includes(i + 1)} onChange={(e) => setKeep(e.target.checked ? [...keep, i + 1].sort((a, b) => a - b) : keep.filter((p) => p !== i + 1))} />{i + 1}쪽 저장</label>
          <details><summary className="cursor-pointer text-meta">{i + 1}쪽 보기</summary>
            {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 선택한 로컬 PDF 쪽 미리보기 */}
            <img src={url} alt={`선택한 결과지 ${i + 1}쪽`} className="mt-2 max-h-[60dvh] w-full object-contain" />
          </details>
        </div>)}
      </fieldset> : previewUrls[0] && <details><summary className="cursor-pointer text-meta">선택한 원본 보기</summary>
        {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 선택한 로컬 이미지 미리보기 */}
        <img src={previewUrls[0]} alt="선택한 채점표 원본" className="mt-2 max-h-[60dvh] w-full object-contain" />
      </details>}
      <p className="text-meta text-muted">{fromPdf
        ? `자동 읽기를 누르면 PDF ${pages.length}쪽 전체(문제 원문이 있는 쪽 포함)가 Groq로 전송됩니다. 저장 시에는 고른 결과표 쪽만 내 Drive에 저장되고 결과와 함께 같은 파티원에게 표시됩니다. 직접 입력하면 Groq에 보내지 않습니다.`
        : "자동 읽기를 누르면 이 이미지가 Groq로 전송됩니다. 저장 시 원본은 내 Drive에 저장되고 결과와 함께 같은 파티원에게 표시됩니다. 직접 입력하면 Groq에 보내지 않습니다."}</p>
    </section>}
    <section aria-labelledby="report-submit-title" className="card gap-4 p-4">
      <h2 id="report-submit-title" className="m-0 text-title">결과 확인 및 제출</h2>
      {!pages.length && <p className="m-0 text-meta text-muted">결과지나 스크린샷을 첨부한 뒤 자동으로 읽거나 직접 입력해 주세요.</p>}
      <fieldset aria-label="채점 결과 입력" disabled={Boolean(busy) || !canSubmit || !pages.length} className="flex min-w-0 flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label>{isWord ? "응시 날짜" : "문제 날짜"}<input className={INPUT} type="date" value={testDate} max={today} disabled={Boolean(busy)} onChange={(e) => setTestDate(e.target.value)} /></label>
        <label>전체 문항 수<input className={INPUT} type="number" min={1} max={200} value={total} disabled={Boolean(busy)} onChange={(e) => setTotal(e.target.value)} /></label>
        <label>정답 수<input className={INPUT} type="number" min={0} max={Number(total) || 200} value={correct} disabled={Boolean(busy)} onChange={(e) => setCorrect(e.target.value)} /></label>
      </div>
      {/* 모바일은 문항마다 A–D 버튼 카드, 데스크톱은 표 */}
      <div className="md:hidden"><ReportRowEditorList writtenAnswers={isWord} rows={rows} disabled={Boolean(busy)} onChange={updateRow} onRemove={(i) => setRows(rows.filter((_, j) => j !== i))} /></div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-meta"><thead><tr><th>번호</th><th>내 답</th><th>정답</th><th>정오</th><th>삭제</th></tr></thead><tbody>{rows.map((row, i) => <tr key={i}>
        <td><input aria-label={`${i + 1}행 문항 번호`} className={INPUT} type="number" min={1} max={200} value={row.number} disabled={Boolean(busy)} onChange={(e) => updateRow(i, { number: Number(e.target.value) })} /></td>
        {(["selected", "correctAnswer"] as const).map((field) => <td key={field}>{isWord ? <input aria-label={`${row.number}번 ${field === "selected" ? "내 답" : "정답"}`} className={INPUT} value={row[field] ?? ""} maxLength={200} placeholder="답 또는 A–D" disabled={Boolean(busy)} onChange={(e) => updateRow(i, { [field]: e.target.value || null })} /> : <select aria-label={`${row.number}번 ${field === "selected" ? "내 답" : "정답"}`} className={INPUT} value={row[field] ?? ""} disabled={Boolean(busy)} onChange={(e) => updateRow(i, { [field]: e.target.value || null })}><option value="">확인 필요</option>{["A","B","C","D"].map((v) => <option key={v}>{v}</option>)}</select>}</td>)}
        <td><select aria-label={`${row.number}번 정오`} className={INPUT} value={row.result} disabled={Boolean(busy) || hasChoiceAnswers(row)} onChange={(e) => updateRow(i, { result: e.target.value as ReportRow["result"] })}><option value="unknown">확인 필요</option><option value="correct">O</option><option value="incorrect">X</option></select></td>
        <td><Button variant="ghost" disabled={Boolean(busy)} onClick={() => setRows(rows.filter((_, j) => j !== i))}>삭제</Button></td>
      </tr>)}</tbody></table></div>
      {!rows.length && <p className="text-meta text-muted">문항별 결과를 읽지 못했거나 합계만 있는 채점표입니다. 필요한 경우 문항을 추가할 수 있어요.</p>}
      <Button variant="secondary" disabled={Boolean(busy) || rows.length >= 200} onClick={() => setRows([...rows, { number: Array.from({ length: 200 }, (_, i) => i + 1).find((n) => !rows.some((r) => r.number === n)) ?? 1, selected: null, correctAnswer: null, result: "unknown" }])}>문항 추가</Button>
      <p className="text-meta text-muted">인식 결과를 원본과 비교해 주세요. 정답 수·문항 수는 필수이며, 문항별 정보가 없으면 합계만 저장합니다. AI 인식은 해커스의 공식 결과 검증을 의미하지 않습니다.</p>
      {isWord && <p className="text-meta text-muted">주관식은 원본의 O/X를 직접 확인해 주세요. 답 문자열이 같거나 다르다는 이유만으로 자동 채점하지 않습니다.</p>}
      </fieldset>
    </section>
    {/* 지난 제출 기록은 접어 둔다. 새로 제출하는 흐름이 먼저 보이게 */}
    {canSubmit && <details className="flex flex-col gap-3">
      <summary className="cursor-pointer text-title">파티 {label} 제출 기록{reports.data ? ` · ${reports.data.reports.length}` : ""}</summary>
      <div className="mt-3 flex flex-col gap-3">
        <Link href={ROUTES.review} className="text-meta text-accent underline">틀린 문제는 내 오답노트에서 복습</Link>
        {reports.isPending ? <p role="status" className="m-0">기록 불러오는 중…</p> : reports.isError ? <Button variant="secondary" className="self-start" onClick={() => reports.refetch()}>기록 다시 불러오기</Button> : <>
          {!reports.data?.reports.length && <p className="m-0 text-meta text-muted">아직 제출한 채점표가 없어요.</p>}
          {reports.data?.reports.map((r) => <details key={r.id} className="card p-4"><summary className="cursor-pointer text-body">{r.test_date} · {r.user_id === me.id ? me.name : r.profiles?.nickname ?? "파티원"} · {r.correct}/{r.total} 정답 ({Math.round(r.correct / r.total * 100)}%)</summary><div className="mt-3 flex flex-col gap-3">
            <span className="text-meta text-muted">제출자 확인 · {r.method === "manual" ? "직접 입력" : "자동 인식 후 확인"}</span>
            <ReportRowsView rows={r.rows} />
            <EvidencePhoto src={evidenceUrl(r.study_log_id)} alt={`${r.test_date} 해커스 ${label} 채점표`} />
          </div></details>)}
        </>}
      </div>
    </details>}
    <PinnedFooter>
      {step === 1 && <FilePickerButton variant="primary" className={BIG} accept={ACCEPT} disabled={Boolean(busy) || !canSubmit} onSelect={(file) => void selectFile(file)}>
        {busy === "file" ? "파일 준비 중…" : "채점표 PDF·이미지 고르기"}
      </FilePickerButton>}
      {step === 2 && <>
        <Button variant="primary" className={BIG} disabled={Boolean(busy)} onClick={read}>{busy === "read" ? "채점표 읽는 중…" : "Groq로 채점표 읽기"}</Button>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 md:flex-none" disabled={Boolean(busy)} onClick={() => { setReview(true); setMethod("manual"); }}>원본 보고 직접 입력</Button>
          <FilePickerButton variant="ghost" className="flex-1 md:flex-none" accept={ACCEPT} disabled={Boolean(busy)} onSelect={(file) => void selectFile(file)}>다른 파일 고르기</FilePickerButton>
        </div>
      </>}
      {step === 3 && <Button variant="primary" className={BIG} disabled={Boolean(busy)} onClick={save}>{busy === "save" ? "Drive와 결과 저장 중…" : `결과 제출 · ${label} 인증`}</Button>}
    </PinnedFooter>
  </div>;
}
