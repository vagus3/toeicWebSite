import type { StudyCategory } from "@/types";

export interface GoalProgress {
  category: StudyCategory;
  actual: number;
  target: number;
}

/** 영역별 달성률 = min(실제 학습량 / 목표 학습량, 1) × 100 */
export function categoryRate({ actual, target }: Pick<GoalProgress, "actual" | "target">) {
  if (target <= 0) return 0;
  return Math.min(actual / target, 1) * 100;
}

/**
 * 일일 달성률 = Σ 활성 목표별 달성률 / 활성 목표 개수
 * 영역별 상한(100%) 덕분에 한 영역을 초과해도 다른 영역의 미달을 상쇄하지 못한다.
 */
export function dailyRate(goals: GoalProgress[]) {
  const active = goals.filter((g) => g.target > 0);
  if (active.length === 0) return 0;
  return active.reduce((sum, g) => sum + categoryRate(g), 0) / active.length;
}

/** 인증 완료 여부만 있는 오늘 할당량을 진행률(%)로 */
export function doneRate(done: Record<StudyCategory, boolean>) {
  const values = Object.values(done);
  return (values.filter(Boolean).length / values.length) * 100;
}
