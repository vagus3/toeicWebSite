import type { Metadata } from "next";
import { QuizRunner } from "@/features/quiz/quiz-runner";

export const metadata: Metadata = { title: "일일 테스트" };

export default function DailyQuizPage() {
  return <QuizRunner />;
}
