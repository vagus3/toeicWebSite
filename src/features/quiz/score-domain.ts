import type { ScoreEntry } from "@/types";

/** 실제 기록 주변을 확대하되 작은 차이는 최소 100점 범위로 보여준다. */
export function scoreDomain(scores: ScoreEntry[]): [number, number] {
  if (!scores.length) return [0, 990];
  const values = scores.map((score) => score.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(20, (max - min) * 0.15);
  const span = Math.min(990, Math.max(100, max - min + padding * 2));
  const lower = Math.max(0, Math.min(990 - span, (min + max - span) / 2));
  return [Math.floor(lower / 10) * 10, Math.min(990, Math.ceil((lower + span) / 10) * 10)];
}
