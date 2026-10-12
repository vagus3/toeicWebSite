"use client";

import { CheckCircle, X, XCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { PinnedFooter } from "@/components/shared/pinned-footer";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { HttpError, requestJson } from "@/lib/http";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import type { RcQuestion, RcResult, RcSession } from "./rc-schema";

const LETTERS = "ABCD";
/** 하단 고정 버튼 — 모바일은 크게 꽉 차게, 데스크톱은 보통 크기 (세로 flex라 self-start로 늘어나지 않게) */
const BIG = "h-control-xl w-full text-base md:h-control-lg md:w-auto md:self-start md:px-6 md:text-body";

export function RcRunner() {
  const partyId = useStudyStore((s) => s.party?.id);
  return <RcSessionRunner key={partyId ?? "none"} partyId={partyId} />;
}

/** 해설을 보고 더 궁금하면 문제를 채운 질문으로 올린다 (질문 제목 최대 2000자) */
function questionTitle(q: RcQuestion, mine: number | undefined) {
  const picked = mine === undefined ? "미응답" : `${LETTERS[mine]}. ${q.opts[mine]}`;
  return `AI RC Part ${q.part} 문제: ${q.text}\n내가 고른 답: ${picked} · 정답: ${LETTERS[q.answer]}. ${q.opts[q.answer]}\n궁금한 점: `.slice(0, 1900);
}

/** 일일 AI RC (보드 5b) — 전체 화면에서 한 문제씩 풀고, 아래 고정 버튼으로 넘긴다 */
function RcSessionRunner({ partyId }: { partyId: string | undefined }) {
  const mode = useStudyStore((s) => s.mode);
  const refresh = useStudyStore((s) => s.refresh);
  const openQuestion = useStudyStore((s) => s.openQuestion);
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
  const solving = Boolean(session && !result && question);

  return (
    <div className="flex w-full max-w-quiz flex-1 flex-col gap-5">
      <ScreenHeader
        leading={{ href: ROUTES.quizzes, label: "테스트로 돌아가기", icon: X }}
        title="AI RC · Part 5·6·7"
        trailing={solving ? `${index + 1}/3` : result ? `${result.score}/3 정답` : undefined}
        below={
          solving && (
            <ProgressBar value={((index + 1) / 3) * 100} className="h-0.75" label="RC 문항 진행" />
          )
        }
      />
      {error && <p role="alert" className="m-0 text-meta text-accent-300">{error}</p>}

      {!session ? (
        <>
          <p className="m-0 text-body leading-reading">
            Part 5 단문 빈칸, Part 6 지문 빈칸, Part 7 독해를 각 1문항씩 풀어요. 4개 보기 중 답을 고르고 제출하면 해설을 볼 수 있어요.
          </p>
          <p className="m-0 text-meta text-muted">
            Groq가 만든 새 연습 문제 · 실제 기출 아님 · 파티별 하루 1세트 · 완료 시 RC 자동 인증. Part 5 목표 20초, 전체 권장 5분.
          </p>
          {mode !== "live" && (
            <p className="m-0 text-meta text-muted">파티에 로그인하면 AI 일일문제를 풀 수 있어요.</p>
          )}
          <PinnedFooter>
            <Button variant="primary" className={BIG} onClick={start} disabled={busy || mode !== "live" || !partyId}>
              {busy ? "오늘 문제 준비 중…" : "오늘 3문항 시작 / 결과 확인"}
            </Button>
          </PinnedFooter>
        </>
      ) : result ? (
        <>
          <div className="card gap-1 p-4">
            <strong className="text-heading">{result.score} / 3 정답</strong>
            <span className="text-meta text-muted">{session.studyDate} · 결과 저장 완료 · RC 인증 완료</span>
          </div>
          {result.questions.map((q, i) => {
            const right = result.answers[i] === q.answer;
            return (
              <section key={q.part} className="card gap-3 p-4">
                <strong className="flex items-center gap-1.5">
                  {right ? (
                    <CheckCircle weight="fill" aria-hidden className="text-accent" />
                  ) : (
                    <XCircle weight="fill" aria-hidden className="text-muted" />
                  )}
                  Part {q.part} · {q.skill} · {right ? "정답" : "오답"}
                </strong>
                {q.passage && (
                  <details open={q.passage.length <= 300}>
                    <summary className="cursor-pointer text-meta text-muted">지문</summary>
                    <p className="m-0 mt-1.5 whitespace-pre-wrap text-body leading-reading">{q.passage}</p>
                  </details>
                )}
                <p className="m-0 text-body leading-reading">{q.text}</p>
                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                  {q.opts.map((opt, j) => (
                    <li key={j} className={cn("rounded-md p-2 text-body", j === q.answer && "bg-accent-soft")}>
                      {LETTERS[j]}. {opt} {j === result.answers[i] ? "(내 선택)" : ""} {j === q.answer ? "✓ 정답" : ""}
                    </li>
                  ))}
                </ol>
                <p className="m-0 whitespace-pre-wrap text-meta leading-reading">{q.why}</p>
                <Button
                  variant="ghost"
                  className="self-start text-meta"
                  onClick={() =>
                    openQuestion({
                      tag: `RC Part ${q.part}` as const,
                      title: questionTitle(q, result.answers[i]),
                      stay: true,
                    })
                  }
                >
                  질문 창구에 올리기
                </Button>
              </section>
            );
          })}
          <p className="m-0 text-meta text-muted">
            AI 생성 문제·해설에는 오류가 있을 수 있어요. 의문이 생기면 질문 창구에서 파티원과 확인해 주세요.
          </p>
          <PinnedFooter>
            {result.score < 3 && (
              <Button asChild variant="primary" className={BIG}>
                <Link href={ROUTES.review}>틀린 문제 오답노트에서 복습</Link>
              </Button>
            )}
            <Button asChild variant="secondary" className={BIG}>
              <Link href={ROUTES.quizzes}>테스트 목록으로</Link>
            </Button>
          </PinnedFooter>
        </>
      ) : (
        question && (
          <>
            <span className="tag tag-neutral self-start">
              Part {question.part} · {question.skill}
            </span>
            {question.passage && (
              <div className="card p-4">
                <p className="m-0 whitespace-pre-wrap text-body leading-reading">{question.passage}</p>
              </div>
            )}
            <p className="m-0 text-heading leading-question">{question.text}</p>
            <div className="flex flex-col gap-3">
              {question.opts.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={busy}
                  aria-pressed={answers[index] === i}
                  className={cn(
                    "flex gap-3 rounded-md p-4 text-left text-body shadow-sm",
                    answers[index] === i && "bg-accent-soft shadow-ring-accent",
                  )}
                  onClick={() =>
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[index] = i;
                      return next;
                    })
                  }
                >
                  <span>{LETTERS[i]}</span>
                  {opt}
                </button>
              ))}
            </div>
            <PinnedFooter>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="h-control-xl flex-1 text-base md:h-control-lg md:flex-none md:px-6 md:text-body"
                  disabled={index === 0 || busy}
                  onClick={() => setIndex(index - 1)}
                >
                  이전
                </Button>
                <Button
                  variant="primary"
                  className="h-control-xl flex-1 text-base md:h-control-lg md:flex-none md:px-6 md:text-body"
                  disabled={answers[index] === undefined || busy}
                  onClick={index === 2 ? submit : () => setIndex(index + 1)}
                >
                  {busy ? "결과 저장 중…" : index === 2 ? "제출하고 해설 보기" : "다음 문제"}
                </Button>
              </div>
            </PinnedFooter>
          </>
        )
      )}
    </div>
  );
}
