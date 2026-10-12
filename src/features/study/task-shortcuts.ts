import { ROUTES } from "@/lib/routes";
import type { StudyCategory } from "@/types";

export interface TaskShortcut {
  label: string;
  href: string;
}

/**
 * 사진 대신 테스트를 마치면 자동으로 인증되는 항목.
 * 해커스 단어·LC·RC 결과 제출 → 각 항목 인증. 교재는 사진으로만 인증한다.
 */
const SHORTCUTS: Record<StudyCategory, TaskShortcut[]> = {
  word: [{ label: "해커스 단어 결과 제출", href: ROUTES.hackersWord }],
  lc: [{ label: "해커스 LC로 인증", href: ROUTES.hackersLc }],
  rc: [
    { label: "해커스 RC로 인증", href: ROUTES.hackersRc },
  ],
  book: [],
};

/**
 * 항목 아래에 보여 줄 테스트 바로가기.
 * 기본 규칙: 오늘 이미 인증한 항목은 숨긴다. 사진을 더 올리는 건 항목을 눌러 한다.
 * (해커스로 인증해도 해당 항목의 완료 상태가 켜진다)
 */
export function shortcutsFor(category: StudyCategory, done: boolean): TaskShortcut[] {
  return done ? [] : SHORTCUTS[category];
}
