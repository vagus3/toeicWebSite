"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStudyStore } from "@/stores/study-store";
import type { ScoreEntry } from "@/types";

/** 실제 기록 주변을 확대하되 작은 차이는 최소 100점 범위로 보여준다. */
function scoreDomain(scores: ScoreEntry[]): [number, number] {
  const values = scores.map((score) => score.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(20, (max - min) * 0.15);
  const span = Math.min(990, Math.max(100, max - min + padding * 2));
  const lower = Math.max(0, Math.min(990 - span, (min + max - span) / 2));
  return [Math.floor(lower / 10) * 10, Math.min(990, Math.ceil((lower + span) / 10) * 10)];
}

function ScoreTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  const entry = payload?.[0]?.payload as ScoreEntry | undefined;
  if (!active || !entry) return null;
  return (
    <div className="rounded-md bg-surface px-2.5 py-1.5 text-label shadow-md">
      <span className="text-muted">{entry.label}</span>{" "}
      <span className="font-medium">{entry.value}점</span>
    </div>
  );
}

/** 내 점수 추이 — 목표선(점선) + 주간 점수 라인 */
export function ScoreChart({ scores }: { scores: ScoreEntry[] }) {
  const me = useStudyStore((s) => s.me);
  if (!scores.length) return <p className="text-meta text-muted">점수를 입력하면 변화 추이를 볼 수 있어요.</p>;
  const domain = scoreDomain(scores);
  const change = scores[scores.length - 1].value - scores[0].value;
  const targetVisible = me.target >= domain[0] && me.target <= domain[1];
  return (
    <figure className="m-0 flex flex-col gap-1.5">
      <div className="aspect-score-chart w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={scores}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <CartesianGrid vertical={false} stroke="var(--color-divider)" strokeDasharray="3 4" />
            <XAxis dataKey="label" hide />
            <YAxis
              domain={domain}
              width={38}
              tickCount={4}
              tick={{ fill: "var(--color-neutral-500)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            {targetVisible && <ReferenceLine
              y={me.target}
              stroke="var(--color-accent)"
              strokeDasharray="3 4"
              strokeOpacity={0.5}
              label={{ value: `목표 ${me.target}`, position: "insideTopRight", fill: "var(--color-accent)", fontSize: 11 }}
            />}
            <Tooltip
              content={({ active, payload }) => (
                <ScoreTooltip active={active} payload={payload} />
              )}
              cursor={{ stroke: "var(--color-divider)" }}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-accent)", stroke: "var(--color-bg)", strokeWidth: 2 }}
              activeDot={{
                r: 4,
                fill: "var(--color-accent)",
                stroke: "var(--color-bg)",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="flex flex-wrap justify-between gap-1 text-caption text-neutral-500">
        <span>{scores[0]?.label}</span>
        <span>최근{scores.length > 1 && ` · 처음 대비 ${change > 0 ? "+" : ""}${change}점`}</span>
      </figcaption>
      <p className="m-0 text-caption text-muted">표시 범위 {domain[0]}–{domain[1]}점 · 기록에 맞춰 자동 조정{!targetVisible && ` · 목표 ${me.target}점은 표시 범위 밖`}</p>
    </figure>
  );
}
