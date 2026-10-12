"use client";

import { CheckCircle, X, XCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PinnedFooter } from "@/components/shared/pinned-footer";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { canRetry, demoItems } from "./review-board";
import {
  questionTag,
  REVIEW_SOURCES,
  SOURCE_LABEL,
  type ReviewItem,
} from "./review-model";
import { useReviewItems, useToggleReviewed } from "./use-review";

const LETTERS = "ABCD";
/** 하단 고정 버튼 — 모바일은 크게 꽉 차게, 데스크톱은 보통 크기 (세로 flex라 self-start로 늘어나지 않게) */
const BIG = "h-control-xl w-full text-base md:h-control-lg md:w-auto md:self-start md:px-6 md:text-body";
const HALF = "h-control-xl flex-1 text-base md:h-control-lg md:flex-none md:px-6 md:text-body";
/** "모르겠어요"를 누르면 보기를 고르지 않은 채 정답을 연다 */
const GAVE_UP = -1;

const letter = (i: number | null) => (i === null ? "미응답" : LETTERS[i]);

/** "해커스 RC · 112번" — 단어 문항은 detail이 이미 "단어 · …"로 시작해서 출처를 겹쳐 쓰지 않는다 */
function itemLabel(item: ReviewItem) {
  const source = SOURCE_LABEL[item.source];
  return item.detail.startsWith(source) ? item.detail : `${source} · ${item.detail}`;
}

function questionTitle(item: ReviewItem) {
  return `오답 다시 풀기 (${itemLabel(item)}): ${item.question}\n처음 고른 답: ${letter(item.myAnswer)} · 정답: ${letter(item.correctAnswer)}\n궁금한 점: `.slice(0, 1900);
}

/**
 * 오답 다시 풀기 (보드 5b) — 복습 전 오답을 한 문제씩 전체 화면으로 풀고,
 * 맞혔으면 복습 완료로 표시한다. ?source=로 출처(일일 RC·단어·해커스)를 좁힌다.
 */
export function ReviewRetry() {
  const sourceParam = useSearchParams().get("source");
  const source = REVIEW_SOURCES.find((s) => s === sourceParam) ?? null;
  const live = useStudyStore((s) => s.mode === "live");
  const studyDate = useStudyStore((s) => s.studyDate);
  const openQuestion = useStudyStore((s) => s.openQuestion);
  const query = useReviewItems();
  const toggleLive = useToggleReviewed();
  const [demoReviewed, setDemoReviewed] = useState<Set<string>>(new Set());
  // 이번에 푼 문제는 복습 완료로 바꿔도 목록에 남긴다. 빠지면 뒤 문제 번호가 당겨진다.
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [rightCount, setRightCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const all: ReviewItem[] = live
    ? (query.data?.items ?? [])
    : demoItems(studyDate).map((i) => ({ ...i, reviewed: demoReviewed.has(i.key) }));
  const queue = all.filter(
    (i) => (!source || i.source === source) && (canRetry(i) || seen.has(i.key)),
  );
  const item = queue[index];
  const answered = pick !== null;
  const right = answered && item !== undefined && pick === item.correctAnswer;

  const choose = (choice: number) => {
    if (answered || !item) return;
    setPick(choice);
    setSeen((prev) => new Set(prev).add(item.key));
    if (choice === item.correctAnswer) setRightCount((n) => n + 1);
  };
  const toggleReviewed = () => {
    if (!item) return;
    if (live) return void toggleLive(item);
    setDemoReviewed((prev) => {
      const next = new Set(prev);
      if (next.has(item.key)) next.delete(item.key);
      else next.add(item.key);
      return next;
    });
  };
  const next = () => {
    if (index + 1 >= queue.length) return setFinished(true);
    setIndex(index + 1);
    setPick(null);
  };

  const solving = !finished && item !== undefined;
  return (
    <div className="flex w-full max-w-quiz flex-1 flex-col gap-5">
      <ScreenHeader
        leading={{ href: ROUTES.review, label: "오답노트로 돌아가기", icon: X }}
        title={source ? `${SOURCE_LABEL[source]} 오답 다시 풀기` : "오답 다시 풀기"}
        trailing={solving ? `${index + 1}/${queue.length}` : undefined}
        below={
          solving && (
            <ProgressBar
              value={((index + (answered ? 1 : 0)) / queue.length) * 100}
              className="h-0.75"
              label="다시 풀기 진행"
            />
          )
        }
      />

      {live && query.isPending ? (
        <p role="status" className="m-0 text-muted">오답노트를 불러오는 중…</p>
      ) : live && query.isError ? (
        <p className="m-0 text-muted">
          오답노트를 불러오지 못했어요.{" "}
          <Link href={ROUTES.review} className="text-accent underline">
            오답노트로 돌아가기
          </Link>
        </p>
      ) : finished ? (
        <>
          <div className="card gap-1 p-4">
            <strong className="text-heading">
              {queue.length}문제 중 {rightCount}문제 맞혔어요
            </strong>
            <span className="text-meta text-muted">
              맞힌 문제를 복습 완료로 표시해 두면 다음 복습에서 빠져요.
            </span>
          </div>
          <PinnedFooter>
            <Button asChild variant="primary" className={BIG}>
              <Link href={ROUTES.review}>오답노트로 돌아가기</Link>
            </Button>
          </PinnedFooter>
        </>
      ) : !item ? (
        <>
          <p className="m-0 text-muted">
            지금 다시 풀 문제가 없어요. 해커스 오답은 오답노트에서 결과지로 문제를 채우면 여기서 풀 수 있어요.
          </p>
          <PinnedFooter>
            <Button asChild variant="secondary" className={BIG}>
              <Link href={ROUTES.review}>오답노트로 돌아가기</Link>
            </Button>
          </PinnedFooter>
        </>
      ) : (
        <>
          <span className="tag tag-neutral self-start">{itemLabel(item)}</span>
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
          {item.question && (
            <p className="m-0 text-heading leading-question text-pretty">{item.question}</p>
          )}
          <div className="flex flex-col gap-2.5">
            {item.options.map((option, j) => {
              const correct = answered && j === item.correctAnswer;
              const wrong = answered && j === pick && j !== item.correctAnswer;
              return (
                <button
                  key={j}
                  type="button"
                  disabled={answered}
                  aria-pressed={pick === j}
                  onClick={() => choose(j)}
                  className={cn(
                    "flex gap-3 rounded-md px-4 py-3.5 text-left text-body",
                    correct
                      ? "bg-accent-soft shadow-ring-accent"
                      : wrong
                        ? "bg-neutral-900 shadow-ring-muted"
                        : "shadow-sm",
                  )}
                >
                  <span className="text-muted">{LETTERS[j]}</span>
                  <span className="flex-1">{option}</span>
                  {answered && j === item.myAnswer && (
                    <span className="tag tag-neutral">처음 고른 답</span>
                  )}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className="card elev-sm gap-2 p-3.5">
              <span className="flex items-center gap-1.5 text-label text-accent-300">
                {right ? (
                  <CheckCircle weight="fill" aria-hidden />
                ) : (
                  <XCircle weight="fill" aria-hidden />
                )}
                {right
                  ? "맞았어요"
                  : item.correctAnswer === null
                    ? "이 문제는 정답 정보가 없어요"
                    : `${pick === GAVE_UP ? "정답은" : "다시 틀렸어요 · 정답은"} ${letter(item.correctAnswer)}`}
              </span>
              {item.explanation && (
                <p className="m-0 whitespace-pre-wrap text-meta leading-reading">{item.explanation}</p>
              )}
              <Button
                variant="ghost"
                className="self-start text-meta"
                onClick={() =>
                  openQuestion({ tag: questionTag(item), title: questionTitle(item), stay: true })
                }
              >
                질문 창구에 올리기
              </Button>
            </div>
          )}
          <PinnedFooter>
            {answered ? (
              <div className="flex gap-3">
                <Button
                  variant={item.reviewed ? "secondary" : "ghost"}
                  aria-pressed={item.reviewed}
                  className={HALF}
                  onClick={toggleReviewed}
                >
                  {item.reviewed ? "✓ 복습 완료" : "복습 완료로 표시"}
                </Button>
                <Button variant="primary" className={HALF} onClick={next}>
                  {index + 1 >= queue.length ? "결과 보기" : "다음 문제"}
                </Button>
              </div>
            ) : (
              <Button variant="secondary" className={BIG} onClick={() => choose(GAVE_UP)}>
                모르겠어요 · 정답 보기
              </Button>
            )}
          </PinnedFooter>
        </>
      )}
    </div>
  );
}
