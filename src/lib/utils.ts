import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * globals.css @theme의 글자 크기 토큰 — tailwind-merge가 text-micro를 색상으로 오인해
 * text-neutral-500 같은 색 클래스와 합칠 때 지워버리지 않도록 등록한다.
 */
const FONT_SIZE_TOKENS = [
  "micro",
  "caption",
  "label",
  "meta",
  "body",
  "base",
  "title",
  "heading",
  "stat",
  "question",
  "h3",
  "hero",
  "display",
  "icon-sm",
  "icon",
  "icon-md",
  "icon-lg",
  "icon-xl",
  "icon-2xl",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZE_TOKENS }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 2026-10-08 → "10월 8일" */
export function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/** 2026-10-08 → "2026-10-08" (한국 시간 기준 study_date 키) */
export function toStudyDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dDay(today: Date, target: Date) {
  const ms =
    Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round(ms / 86_400_000);
}

/** 이번 주 토요일(주간 테스트일) → "10/10" */
export function weekTestLabel(today: Date) {
  const sat = new Date(today);
  sat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));
  return `${sat.getMonth() + 1}/${sat.getDate()}`;
}
