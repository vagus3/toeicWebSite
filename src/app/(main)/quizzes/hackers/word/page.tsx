import type { Metadata } from "next";
import { HackersRunner } from "@/features/quiz/hackers-runner";

export const metadata: Metadata = { title: "해커스 단어 시험 결과 제출" };

export default function HackersWordPage() {
  return <HackersRunner category="word" />;
}
