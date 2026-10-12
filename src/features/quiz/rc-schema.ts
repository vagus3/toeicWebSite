import { z } from "zod";

/** 출제 기능 종료 전 저장된 RC 응시 기록을 오답노트에서 읽기 위한 형식. */
const text = z.string().trim().min(1);
export const rcQuestionSchema = z.object({
  part: z.union([z.literal(5), z.literal(6), z.literal(7)]),
  skill: text.max(100),
  passage: z.string().trim().max(6000),
  text: text.max(1000),
  opts: z.array(text.max(500)).length(4).refine((opts) => new Set(opts.map((s) => s.toLowerCase())).size === 4, "duplicate_options"),
  answer: z.number().int().min(0).max(3),
  why: text.max(3000),
}).superRefine((q, ctx) => {
  if (q.part !== 5 && q.passage.length < 100) ctx.addIssue({ code: "custom", message: "passage_required" });
  const blankSource = q.part === 5 ? q.text : q.passage;
  if (q.part !== 7 && (blankSource.match(/_{3,}/g) ?? []).length !== 1) ctx.addIssue({ code: "custom", message: "one_blank_required" });
});
export const rcSetSchema = z.object({
  questions: z.array(rcQuestionSchema).length(3).refine((qs) => qs.every((q, i) => q.part === i + 5), "parts_5_6_7_required"),
});
export type RcQuestion = z.infer<typeof rcQuestionSchema>;
