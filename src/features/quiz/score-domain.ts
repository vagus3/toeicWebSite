import type { ScoreEntry } from "@/types";

/**
 * 점수 그래프의 세로 범위. 0~990 전체를 쓰면 몇십 점 변화가 평평한 선이 된다.
 * 점수와 목표가 모두 보이게 최소·최대에 여유(범위의 15%, 최소 40점)를 두고 10점 단위로 맞춘다.
 */
export function scoreDomain(scores: ScoreEntry[], target: number): [number, number] {
  const values = [...scores.map((s) => s.value), target];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(40, Math.round((max - min) * 0.15));
  return [
    Math.max(0, Math.floor((min - pad) / 10) * 10),
    Math.min(990, Math.ceil((max + pad) / 10) * 10),
  ];
}
