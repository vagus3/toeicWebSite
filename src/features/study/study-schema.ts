import { z } from "zod";
import { QUESTION_TAGS } from "@/features/qna/ask-schema";
import { QUIZ } from "@/lib/demo-data";

const partyId = z.uuid();
export const studyActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("score"),
    partyId,
    lc: z.number().int().min(0).max(495),
    rc: z.number().int().min(0).max(495),
  }),
  z.object({
    action: z.literal("question"),
    partyId,
    tag: z.enum(QUESTION_TAGS),
    title: z.string().trim().min(4).max(2000),
  }),
  z.object({
    action: z.literal("ask-ai"),
    partyId,
    threadId: z.uuid(),
    prompt: z.string().trim().min(1).max(2000),
  }),
  z.object({
    action: z.literal("reply"),
    partyId,
    threadId: z.uuid(),
    text: z.string().trim().min(1).max(1000),
  }),
  z.object({ action: z.literal("cheer"), partyId, logId: z.uuid() }),
  z.object({ action: z.literal("nudge"), partyId, memberId: z.uuid() }),
  z.object({
    action: z.literal("quiz"),
    partyId,
    answers: z.array(z.number().int().min(0).max(3)).length(QUIZ.length),
  }),
]);
export type StudyAction = z.infer<typeof studyActionSchema>;

export function gradeQuiz(answers: number[]) {
  return QUIZ.reduce(
    (score, question, i) => score + Number(answers[i] === question.answer),
    0,
  );
}
