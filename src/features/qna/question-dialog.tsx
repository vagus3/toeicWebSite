"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { ME } from "@/lib/demo-data";
import { requestJson } from "@/lib/http";
import { useModal, useStudyStore } from "@/stores/study-store";
import { useToast } from "@/stores/toast-store";
import { askRequestSchema, QUESTION_TAGS, type AskResponse } from "./ask-schema";

type QuestionForm = z.infer<typeof askRequestSchema>;

/** 새 질문 — 서버(/api/ai/ask)에서 Gemini로 초안 답변을 만든 뒤 스레드에 올린다 */
export function QuestionDialog() {
  const { open, close, onOpenChange } = useModal("question");
  const addThread = useStudyStore((s) => s.addThread);
  const flash = useToast((s) => s.flash);

  const { register, handleSubmit, reset, formState } = useForm<QuestionForm>({
    resolver: zodResolver(askRequestSchema),
    defaultValues: { tag: QUESTION_TAGS[0], title: "" },
  });

  const ask = useMutation({
    mutationFn: (input: QuestionForm) => requestJson<AskResponse>("/api/ai/ask", input),
    onSuccess: ({ answer }, input) => {
      addThread({ id: crypto.randomUUID(), tag: input.tag, who: `${ME.name} · 방금`, title: input.title, ai: answer, replies: [] });
      reset();
      flash("질문을 올렸어요 · AI 초안 답변 완료");
    },
    onError: () => flash("AI 답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>질문하기</DialogTitle>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((v) => ask.mutate(v))} noValidate>
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
            <textarea id="q-title" className="input" placeholder="교재 쪽수·문항 번호를 같이 적으면 파티원이 보충하기 쉬워요" {...register("title")} />
            <FieldError message={formState.errors.title?.message} />
          </div>
          <DialogActions>
            <Button variant="secondary" onClick={close}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={ask.isPending}>
              {ask.isPending ? "AI 초안 만드는 중…" : "올리기"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
