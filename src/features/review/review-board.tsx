"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { prepareReportImages, reportFileErrorMessage } from "@/features/quiz/pdf-to-image";
import { QUIZ } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { buildReviewItems, type ReviewItem, type ReviewSource } from "./review-model";
import { reviewQueryKey, useReviewItems, useToggleReviewed } from "./use-review";

const SOURCE_LABEL: Record<ReviewSource, string> = {
  daily_rc: "일일 RC",
  hackers_rc: "해커스 RC",
  hackers_lc: "해커스 LC",
  word: "단어",
};
const SOURCES = Object.keys(SOURCE_LABEL) as ReviewSource[];
const STATUS = { pending: "복습 전", reviewed: "복습 완료", all: "전체" } as const;
type Status = keyof typeof STATUS;
const LETTERS = "ABCD";
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const chip = (active: boolean) => cn("tag cursor-pointer", active ? "tag-accent" : "tag-outline");

function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;
}
const isHackers = (source: ReviewSource) => source === "hackers_rc" || source === "hackers_lc";

/** 데모 모드에서 화면 구성을 보여주기 위한 예시 오답 */
function demoItems(studyDate: string) {
  return buildReviewItems({
    dailyRc: [],
    word: [{ attemptId: "demo-word", takenOn: studyDate, answers: QUIZ.map((q, i) => (i === 1 ? (q.answer + 1) % 4 : q.answer)) }],
    hackers: [{
      reportId: "demo-report", category: "rc", testDate: studyDate,
      rows: [{ number: 112, selected: "B", correctAnswer: "D", result: "incorrect" }],
    }],
    notes: [],
    quiz: QUIZ,
  });
}

function ReviewItemCard({
  item,
  hideAnswers,
  onToggle,
}: {
  item: ReviewItem;
  hideAnswers: boolean;
  onToggle: () => void;
}) {
  const [retry, setRetry] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const shown = !hideAnswers || revealed || retry !== null;
  const letter = (i: number | null) => (i === null ? "미응답" : LETTERS[i]);
  return (
    <article className="flex flex-col gap-2.5 border-t border-divider pt-3.5 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-meta font-medium">{item.detail}</span>
        <Button
          variant={item.reviewed ? "secondary" : "ghost"}
          aria-pressed={item.reviewed}
          className="text-meta"
          onClick={onToggle}
        >
          {item.reviewed ? "✓ 복습 완료" : "복습 완료로 표시"}
        </Button>
      </div>
      {item.passage && (
        <details open={item.passage.length <= 300}>
          <summary className="cursor-pointer text-meta text-muted">지문</summary>
          <p className="m-0 mt-1.5 whitespace-pre-wrap text-body leading-reading">{item.passage}</p>
        </details>
      )}
      {item.script && (
        <details>
          <summary className="cursor-pointer text-meta text-muted">듣기 스크립트</summary>
          <p className="m-0 mt-1.5 whitespace-pre-wrap text-body leading-reading">{item.script}</p>
        </details>
      )}
      {item.question && <p className="m-0 text-body leading-reading text-pretty">{item.question}</p>}
      {!item.hasContent && (
        <p className="m-0 text-meta text-muted">
          아직 문제 내용이 없어요. 위의 버튼으로 결과지에서 채울 수 있어요.
        </p>
      )}
      {item.options.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {item.options.map((option, j) => {
            const correct = shown && j === item.correctAnswer;
            const wrongPick = shown && (j === item.myAnswer || j === retry) && j !== item.correctAnswer;
            const content = (
              <>
                <span className="text-muted">{LETTERS[j]}</span>
                <span className="flex-1">{option}</span>
                {correct && <span className="tag tag-accent">정답</span>}
                {shown && j === item.myAnswer && (
                  <span className="tag tag-neutral">{hideAnswers ? "처음 고른 답" : "내 답"}</span>
                )}
                {j === retry && j !== item.myAnswer && <span className="tag tag-outline">다시 고른 답</span>}
              </>
            );
            const className = cn(
              "flex items-start gap-3 rounded-md px-3 py-2.5 text-left text-body",
              correct ? "bg-accent-soft shadow-ring-accent" : wrongPick ? "shadow-ring-muted" : "shadow-sm",
            );
            // 정답을 가린 상태에서는 보기를 골라 다시 풀어 본다
            return (
              <li key={j}>
                {hideAnswers && retry === null && !revealed ? (
                  <button type="button" className={cn(className, "w-full cursor-pointer")} onClick={() => setRetry(j)}>
                    {content}
                  </button>
                ) : (
                  <div className={className}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        shown && (
          <p className="m-0 text-meta">
            내 답 {letter(item.myAnswer)} · 정답 {letter(item.correctAnswer)}
          </p>
        )
      )}
      {retry !== null && (
        <p role="status" className="m-0 text-meta text-accent-300">
          {retry === item.correctAnswer ? "맞았어요" : `다시 틀렸어요 · 정답은 ${letter(item.correctAnswer)}`}
        </p>
      )}
      {!shown && (
        <Button variant="secondary" className="self-start text-meta" onClick={() => setRevealed(true)}>
          정답 보기
        </Button>
      )}
      {shown && item.explanation && (
        <details>
          <summary className="cursor-pointer text-meta text-accent-300">
            해설 보기 · {item.explanationSource === "printed" ? "결과지 해설" : "AI 해설"}
          </summary>
          <p className="m-0 mt-1.5 whitespace-pre-wrap text-meta leading-reading">{item.explanation}</p>
        </details>
      )}
    </article>
  );
}

function FillFromReport({
  reportId,
  hasMissing,
  demo,
}: {
  reportId: string;
  hasMissing: boolean;
  demo: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const client = useQueryClient();
  const partyId = useStudyStore((s) => s.party?.id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function fill(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setMessage("");
    try {
      let pages: File[];
      try {
        ({ pages } = await prepareReportImages(file));
      } catch (error) {
        setMessage(reportFileErrorMessage(error));
        return;
      }
      const body = new FormData();
      body.append("reportId", reportId);
      pages.forEach((page) => body.append("file", page, page.name));
      const response = await fetch("/api/review/hackers", { method: "POST", body });
      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "오늘 자동 읽기 요청이 많아요. 내일 다시 시도해 주세요."
            : response.status === 503
              ? "AI 연결이 준비되지 않았어요. 운영자에게 알려 주세요."
              : "결과지를 읽지 못했어요. 이 채점표의 결과지 PDF가 맞는지 확인하고 다시 시도해 주세요.",
        );
        return;
      }
      const { filled, missing } = (await response.json()) as { filled: number[]; missing: number[] };
      setMessage(
        `${filled.length}문항의 문제·해설을 채웠어요.` +
          (missing.length ? ` ${missing.join(", ")}번은 결과지에서 찾지 못했어요.` : ""),
      );
      await client.invalidateQueries({ queryKey: reviewQueryKey(partyId) });
    } catch {
      setMessage("결과지를 읽지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void fill(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        variant={hasMissing ? "secondary" : "ghost"}
        className="self-start text-meta"
        disabled={busy || demo}
        onClick={() => input.current?.click()}
      >
        {busy ? "결과지 읽는 중…" : hasMissing ? "결과지 PDF로 문제·해설 채우기" : "결과지로 다시 채우기"}
      </Button>
      {hasMissing && (
        <p className="m-0 text-caption text-muted">
          결과지 PDF 전체(문제가 있는 쪽 포함)가 Groq로 전송돼요. 채운 문제·해설은 나만 볼 수 있어요.
        </p>
      )}
      {message && (
        <p role="status" className="m-0 text-meta text-accent-300">
          {message}
        </p>
      )}
    </div>
  );
}

export function ReviewBoard() {
  const mode = useStudyStore((s) => s.mode);
  const studyDate = useStudyStore((s) => s.studyDate);
  const live = mode === "live";
  const query = useReviewItems();
  const toggleLive = useToggleReviewed();
  const [demoReviewed, setDemoReviewed] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<ReviewSource | "">("");
  const [status, setStatus] = useState<Status>("pending");
  const [hideAnswers, setHideAnswers] = useState(false);
  // 이번에 상태를 바꾼 문항은 필터를 바꿀 때까지 그 자리에 둔다 (실수로 눌러도 되돌릴 수 있게)
  const [sticky, setSticky] = useState<Set<string>>(new Set());
  const items: ReviewItem[] = live
    ? (query.data?.items ?? [])
    : demoItems(studyDate).map((i) => ({ ...i, reviewed: demoReviewed.has(i.key) }));
  const pending = items.filter((i) => !i.reviewed).length;
  const visible = items.filter(
    (i) =>
      (!source || i.source === source) &&
      (status === "all" || sticky.has(i.key) || (status === "pending" ? !i.reviewed : i.reviewed)),
  );
  const groups = new Map<string, ReviewItem[]>();
  for (const item of visible) {
    const key = `${item.source}:${item.sourceRef}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const resetSticky = () => setSticky(new Set());
  const toggle = (item: ReviewItem) => {
    setSticky((prev) => new Set(prev).add(item.key));
    if (live) return void toggleLive(item);
    setDemoReviewed((prev) => {
      const next = new Set(prev);
      if (next.has(item.key)) next.delete(item.key);
      else next.add(item.key);
      return next;
    });
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <Link href={ROUTES.quizzes} className="text-meta text-muted">
        ← 테스트 목록
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <PageTitle>오답노트</PageTitle>
        <span className="text-meta text-muted">복습할 오답 {pending}개 · 나만 볼 수 있어요</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-2">
          {(["", ...SOURCES] as const).map((s) => (
            <button
              key={s || "all"}
              type="button"
              aria-pressed={source === s}
              className={chip(source === s)}
              onClick={() => {
                setSource(s);
                resetSticky();
              }}
            >
              {s ? SOURCE_LABEL[s] : "전체"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(STATUS) as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              className={chip(status === s)}
              onClick={() => {
                setStatus(s);
                resetSticky();
              }}
            >
              {STATUS[s]}
            </button>
          ))}
          <Button
            variant={hideAnswers ? "secondary" : "ghost"}
            aria-pressed={hideAnswers}
            className="ml-auto text-meta"
            onClick={() => setHideAnswers(!hideAnswers)}
          >
            {hideAnswers ? "정답 가리는 중 · 다시 풀기" : "정답 가리고 다시 풀기"}
          </Button>
        </div>
      </div>

      {live && query.isPending ? (
        <p role="status" className="text-muted">오답노트를 불러오는 중…</p>
      ) : live && query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-muted">오답노트를 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            다시 불러오기
          </Button>
        </div>
      ) : !items.length ? (
        <p className="text-muted">
          아직 틀린 문제가 없어요. 일일 RC·단어 테스트를 풀거나 해커스 채점표를 제출하면 틀린 문제가 여기에 모여요.
        </p>
      ) : !visible.length ? (
        <p className="text-muted">
          {status === "pending"
            ? "복습할 오답을 모두 끝냈어요. '복습 완료'에서 다시 볼 수 있어요."
            : "조건에 맞는 문제가 없어요."}
        </p>
      ) : (
        [...groups.entries()].map(([key, groupItems]) => {
          const first = groupItems[0];
          const hackers = isHackers(first.source);
          return (
            <section key={key} className="card gap-4 p-4">
              <header className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag tag-accent">{SOURCE_LABEL[first.source]}</span>
                  <b className="text-body font-medium">
                    {hackers ? `문제 날짜 ${dayLabel(first.date)}` : dayLabel(first.date)}
                  </b>
                  <span className="text-meta text-muted">틀린 문제 {groupItems.length}개</span>
                </div>
                {hackers && (
                  <FillFromReport
                    reportId={first.sourceRef}
                    hasMissing={groupItems.some((i) => !i.hasContent)}
                    demo={!live}
                  />
                )}
              </header>
              {groupItems.map((item) => (
                <ReviewItemCard
                  key={`${item.key}:${hideAnswers}`}
                  item={item}
                  hideAnswers={hideAnswers}
                  onToggle={() => toggle(item)}
                />
              ))}
            </section>
          );
        })
      )}
      {items.length > 0 && (
        <p className="text-caption text-muted">
          일일 RC·단어 문제와 AI 해설은 AI가 만든 것이라 오류가 있을 수 있어요. 의문이 생기면 질문 창구에서 파티원과 확인해 주세요.
        </p>
      )}
    </div>
  );
}
