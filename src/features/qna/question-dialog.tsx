"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { ROUTES } from "@/lib/routes";
import { useModal, useStudyStore } from "@/stores/study-store";
import { useToast } from "@/stores/toast-store";
import {
  askRequestSchema,
  QUESTION_TAGS,
} from "./ask-schema";

type QuestionForm = z.infer<typeof askRequestSchema>;

/** 새 질문을 파티에 공유하고 첫 AI 답변을 받는다. */
export function QuestionDialog() {
  const { open, close, onOpenChange } = useModal("question");
  const addThread = useStudyStore((s) => s.addThread);
  const flash = useToast((s) => s.flash);
  const mode = useStudyStore((s) => s.mode);
  const me = useStudyStore((s) => s.me);
  const saveQuestion = useStudyStore((s) => s.saveQuestion);
  const draft = useStudyStore((s) => s.questionDraft);
  const router = useRouter();

  const { register, handleSubmit, reset, formState } = useForm<QuestionForm>({
    resolver: zodResolver(askRequestSchema),
    defaultValues: { tag: QUESTION_TAGS[0], title: "" },
  });

  // 퀴즈 해설 등에서 내용을 채워 열면 그 내용으로 시작한다. 빈 채로 열면 쓰던 내용을 그대로 둔다.
  useEffect(() => {
    if (open && draft) reset({ tag: draft.tag, title: draft.title });
  }, [open, draft, reset]);

  const ask = useMutation({
    mutationFn: async (input: QuestionForm) => {
      const stay = Boolean(draft?.stay);
      if (mode === "live") {
        const id = await saveQuestion(input.tag, input.title);
        if (id === null) throw new Error("save_failed");
        return { id, demo: false, stay };
      }
      const id = crypto.randomUUID();
      addThread({
        id,
        tag: input.tag,
        who: `${me.name} · 방금`,
        title: input.title,
        ai: "",
        replies: [],
      });
      return { id, demo: true, stay };
    },
    // 보통은 올린 질문의 상세로 가서 AI 첫 답변을 보게 한다.
    // 문제를 풀다가 올렸으면(stay) 풀던 화면에 남는다.
    onSuccess: ({ id, demo, stay }) => {
      reset();
      flash(
        demo
          ? "데모 질문을 올렸어요. AI 대화는 로그인 후 사용할 수 있어요"
          : stay
            ? "질문을 올렸어요. 질문 창구에서 AI 답변을 볼 수 있어요"
            : "질문을 올렸어요",
      );
      if (!stay) router.push(id ? ROUTES.qnaThread(id) : ROUTES.qna);
    },
    onError: () =>
      flash("질문을 저장하지 못했어요. 잠시 후 다시 시도해 주세요"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>질문하기</DialogTitle>
        <form
          className="flex flex-col gap-3"
          onSubmit={handleSubmit((v) => ask.mutate(v))}
          noValidate
        >
          <div className="field">
            <label htmlFor="q-tag">영역</label>
            <select id="q-tag" className="input" {...register("tag")}>
              {QUESTION_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="q-title">질문</label>
            <textarea
              id="q-title"
              className="input"
              rows={5}
              maxLength={2000}
              placeholder="예: because와 because of의 차이를 토익 예문으로 설명해 줘. 교재 쪽수·문항 번호를 적어 파티원에게 물어봐도 좋아요"
              {...register("title")}
            />
            <FieldError message={formState.errors.title?.message} />
          </div>
          <p className="m-0 text-label text-muted">질문은 파티원에게 공유되며 AI 답변을 위해 Groq에 전달돼요. 개인정보는 입력하지 마세요.</p>
          <DialogActions>
            <Button variant="secondary" onClick={close}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={ask.isPending}>
              {ask.isPending ? "질문 올리고 답변 받는 중…" : "질문 올리기"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
