"use client";

import dynamic from "next/dynamic";
import { useStudyStore } from "@/stores/study-store";

// 대화상자는 열릴 때만 받는다. 항상 마운트하면 폼 라이브러리(react-hook-form·zod)와 대화상자 코드가
// 모든 화면의 첫 실행에 포함돼, 홈 화면 앱이 처음 열릴 때 내려받는 양이 늘어난다.
const UploadDialog = dynamic(
  () => import("@/features/study/upload-dialog").then((m) => m.UploadDialog),
  { ssr: false },
);
const ScoreDialog = dynamic(
  () => import("@/features/quiz/score-dialog").then((m) => m.ScoreDialog),
  { ssr: false },
);
const QuestionDialog = dynamic(
  () => import("@/features/qna/question-dialog").then((m) => m.QuestionDialog),
  { ssr: false },
);

/** 지금 열린 대화상자 하나만 마운트한다. 닫으면 store의 modal이 null이 되어 사라진다 */
export function ModalHost() {
  const modal = useStudyStore((s) => s.modal);
  if (modal === "upload") return <UploadDialog />;
  if (modal === "score") return <ScoreDialog />;
  if (modal === "question") return <QuestionDialog />;
  return null;
}
