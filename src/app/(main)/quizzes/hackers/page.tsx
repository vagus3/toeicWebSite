import type { Metadata } from "next";
import { HackersRunner } from "@/features/quiz/hackers-runner";
export const metadata: Metadata = { title: "해커스 RC 채점표 제출" };
export default function HackersQuizPage() { return <HackersRunner />; }
