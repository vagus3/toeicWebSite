"use client";

import { Sparkle, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLink } from "@/components/shared/icon-link";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { QUIZ } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { useToast } from "@/stores/toast-store";

/** 일일 단어 테스트 — 3문항, 고르면 정답/오답 + AI 해설 */
export function QuizRunner() {
  const router = useRouter();
  const finishQuiz = useStudyStore((s) => s.finishQuiz);
  const flash = useToast((s) => s.flash);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const q = QUIZ[index];
  const answered = pick !== null;
  const isLast = index === QUIZ.length - 1;

  const choose = (i: number) => {
    if (answered) return;
    setPick(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (!isLast) {
      setIndex(index + 1);
      setPick(null);
      return;
    }
    finishQuiz(score);
    flash("일일 테스트 완료 · 단어 자동 인증");
    router.push(ROUTES.quizzes);
  };

  return (
    <div className="flex max-w-quiz flex-col gap-5 md:gap-5.5">
      <div className="flex items-center gap-2.5 md:gap-3">
        <IconLink href={ROUTES.quizzes} label="테스트로 돌아가기" icon={X} iconClassName="text-icon-md md:text-icon" />
        <ProgressBar value={((index + (answered ? 1 : 0)) / QUIZ.length) * 100} className="h-0.75 flex-1" barClassName="duration-300" label="문항 진행" />
        <span className="text-label text-muted md:text-meta">
          {index + 1}/{QUIZ.length}
        </span>
      </div>

      <span className="tag tag-neutral self-start">Day 12 · 빈칸 채우기</span>
      <p className="m-0 text-heading leading-question text-pretty md:text-question">{q.text}</p>

      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-[repeat(auto-fit,minmax(var(--spacing-card-min),1fr))]">
        {q.opts.map((word, i) => {
          const correct = answered && i === q.answer;
          const wrong = answered && i === pick && i !== q.answer;
          return (
            <button
              key={word}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={pick === i}
              className={cn(
                "flex cursor-pointer gap-3 rounded-md px-4 py-3.5 text-left text-base md:p-4 md:text-title",
                correct ? "bg-accent-soft shadow-ring-accent" : wrong ? "bg-neutral-900 shadow-ring-muted" : "bg-transparent shadow-sm",
              )}
            >
              <span className="text-muted">{"ABCD"[i]}</span>
              {word}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="card elev-sm gap-1.5 p-3.5 md:p-4">
          <span className="flex items-center gap-1.5 text-label text-accent-300">
            <Sparkle />
            {pick === q.answer ? "정답" : "오답"} · AI 해설
          </span>
          <span className="text-meta leading-reading md:text-body">{q.why}</span>
        </div>
      )}

      <Button
        variant="primary"
        className="h-control-xl w-full text-base md:h-control-lg md:w-auto md:self-start md:px-6 md:text-body"
        onClick={next}
        disabled={!answered}
      >
        {isLast ? "결과 보기" : "다음 문제"}
      </Button>
    </div>
  );
}
