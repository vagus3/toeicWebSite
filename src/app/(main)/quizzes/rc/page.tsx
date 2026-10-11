import type { Metadata } from "next";
import { RcRunner } from "@/features/quiz/rc-runner";
export const metadata: Metadata = { title: "일일 RC 테스트" };
export default function DailyRcPage() { return <RcRunner />; }
