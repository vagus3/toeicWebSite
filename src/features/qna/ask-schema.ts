import { z } from "zod";

export const QUESTION_TAGS = ["RC Part 5", "RC Part 6", "RC Part 7", "LC Part 1", "LC Part 2", "LC Part 3", "LC Part 4", "단어", "문법"] as const;

export const askRequestSchema = z.object({
  tag: z.enum(QUESTION_TAGS),
  title: z.string().trim().min(4, "질문을 조금 더 자세히 적어 주세요").max(500),
});

export interface AskResponse {
  answer: string;
  /** Gemini 키가 없어서 안내 문구로 대체했는지 */
  fallback: boolean;
}
