"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/shared/page-title";
import { ProgressBar } from "@/components/ui/progress-bar";
import { HttpError, requestJson } from "@/lib/http";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import type { RcResult, RcSession } from "./rc-schema";

export function RcRunner() {
  const partyId = useStudyStore((s) => s.party?.id);
  return <RcSessionRunner key={partyId ?? "none"} partyId={partyId} />;
}

function RcSessionRunner({ partyId }: { partyId: string | undefined }) {
  const mode = useStudyStore((s) => s.mode);
  const refresh = useStudyStore((s) => s.refresh);
  const [session, setSession] = useState<RcSession | null>(null);
  const [result, setResult] = useState<RcResult | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  async function start() {
    if (pending.current || !partyId) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const data = await requestJson<RcSession>("/api/quizzes/rc", { action: "start", partyId });
      setSession(data); setResult(data.result); setAnswers([]); setIndex(0);
    } catch (e) {
      setError(e instanceof HttpError && e.status === 409 ? "파티의 오늘 문제를 생성 중이에요. 잠시 후 다시 눌러 주세요."
        : e instanceof HttpError && e.status === 503 ? "Groq 연결이 준비되지 않았어요. 운영자에게 확인해 주세요."
        : e instanceof HttpError && e.status === 429 ? "요청이 많아요. 잠시 후 다시 시도해 주세요."
        : "문제를 불러오지 못했어요. 다시 시도해 주세요.");
    } finally { pending.current = false; setBusy(false); }
  }
  async function submit() {
    if (pending.current || !session || answers.length !== 3) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const data = await requestJson<RcResult>("/api/quizzes/rc", { action: "submit", partyId, setId: session.setId, answers });
      setResult(data);
      try { await refresh(); } catch { setError("결과는 저장됐지만 학습 현황을 갱신하지 못했어요. 새로고침해 주세요."); }
    } catch (e) {
      setError(e instanceof HttpError && e.message.includes("quiz_expired") ? "날짜가 바뀌었어요. 테스트 목록으로 돌아가 오늘 문제를 시작해 주세요."
        : "결과를 저장하지 못했어요. 선택한 답은 유지되니 다시 제출해 주세요.");
    } finally { pending.current = false; setBusy(false); }
  }
  const question = session?.questions[index];
  return (
    <div className="flex w-full max-w-quiz flex-col gap-5">
      <Link href={ROUTES.quizzes} className="text-meta text-muted">← 테스트 목록</Link>
      <PageTitle>일일 RC · Part 5·6·7</PageTitle>
      {error && <p role="alert" className="text-meta text-accent-300">{error}</p>}
      {!session ? <>
        <p className="text-body leading-reading">Part 5 단문 빈칸, Part 6 지문 빈칸, Part 7 독해를 각 1문항씩 풀어요. 4개 보기 중 답을 고르고 제출하면 해설을 볼 수 있어요.</p>
        <p className="text-meta text-muted">Groq가 만든 새 연습 문제 · 실제 기출 아님 · 파티별 하루 1세트 · 완료 시 RC 자동 인증. Part 5 목표 20초, 전체 권장 5분.</p>
        <Button variant="primary" onClick={start} disabled={busy || mode !== "live" || !partyId}>{busy ? "오늘 문제 준비 중…" : "오늘 3문항 시작 / 결과 확인"}</Button>
        {mode !== "live" && <p className="text-meta text-muted">파티에 로그인하면 AI 일일문제를 풀 수 있어요.</p>}
      </> : result ? <>
        <div className="card gap-2 p-4"><strong className="text-heading">{result.score} / 3 정답</strong><span className="text-meta">{session.studyDate} · 결과 저장 완료 · RC 인증 완료</span></div>
        {result.questions.map((q, i) => <section key={q.part} className="card gap-3 p-4">
          <strong>Part {q.part} · {q.skill} · {result.answers[i] === q.answer ? "정답" : "오답"}</strong>
          {q.passage && <p className="whitespace-pre-wrap text-body leading-reading">{q.passage}</p>}
          <p className="text-body leading-reading">{q.text}</p>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">{q.opts.map((opt, j) => <li key={j} className={cn("rounded-md p-2 text-body", j === q.answer && "bg-accent-soft")}>
            {"ABCD"[j]}. {opt} {j === result.answers[i] ? "(내 선택)" : ""} {j === q.answer ? "✓ 정답" : ""}
          </li>)}</ol>
          <p className="whitespace-pre-wrap text-meta leading-reading">{q.why}</p>
        </section>)}
        <p className="text-meta text-muted">AI 생성 문제·해설에는 오류가 있을 수 있어요. 의문이 생기면 질문 창구에서 파티원과 확인해 주세요.</p>
        <Button asChild variant="secondary"><Link href={ROUTES.quizzes}>테스트 목록으로</Link></Button>
      </> : question && <>
        <ProgressBar value={((index + 1) / 3) * 100} label="RC 문항 진행" />
        <span className="tag tag-neutral self-start">{index + 1}/3 · Part {question.part} · {question.skill}</span>
        {question.passage && <div className="card p-4"><p className="m-0 whitespace-pre-wrap text-body leading-reading">{question.passage}</p></div>}
        <p className="text-heading leading-question">{question.text}</p>
        <div className="flex flex-col gap-3">{question.opts.map((opt, i) => <button key={i} type="button" disabled={busy} aria-pressed={answers[index] === i}
          className={cn("flex gap-3 rounded-md p-4 text-left text-body shadow-sm", answers[index] === i && "bg-accent-soft shadow-ring-accent")}
          onClick={() => setAnswers((prev) => { const next = [...prev]; next[index] = i; return next; })}><span>{"ABCD"[i]}</span>{opt}</button>)}</div>
        <div className="flex gap-3">
          <Button variant="secondary" disabled={index === 0 || busy} onClick={() => setIndex(index - 1)}>이전</Button>
          <Button variant="primary" disabled={answers[index] === undefined || busy} onClick={index === 2 ? submit : () => setIndex(index + 1)}>{busy ? "결과 저장 중…" : index === 2 ? "제출하고 해설 보기" : "다음 문제"}</Button>
        </div>
      </>}
    </div>
  );
}
