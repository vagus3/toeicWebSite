import { plainTutorText } from "@/lib/ai/tutor-text";
import { cn } from "@/lib/utils";

/**
 * AI 답변 본문 — 채팅 AI 말풍선과 질문 창구가 같이 쓴다.
 * 강조 문법은 지우고, 문장 구조 설명("A / B / C" 줄)의 줄바꿈은 그대로 보여 준다.
 * 긴 영어 단어나 구분 기호 줄이 좁은 화면을 넘지 않도록 단어 중간에서도 줄을 바꾼다.
 */
export function AiText({ text, className }: { text: string; className?: string }) {
  return (
    <p
      className={cn(
        "m-0 whitespace-pre-wrap break-words text-meta leading-reading md:text-body",
        className,
      )}
    >
      {plainTutorText(text)}
    </p>
  );
}
