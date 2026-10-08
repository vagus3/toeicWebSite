"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ME } from "@/lib/demo-data";
import type { ScoreEntry } from "@/types";

/** 점수 축 범위 — 시안의 600~820 매핑 */
const DOMAIN: [number, number] = [600, 820];

function ScoreTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const entry = payload?.[0]?.payload as ScoreEntry | undefined;
  if (!active || !entry) return null;
  return (
    <div className="rounded-md bg-surface px-2.5 py-1.5 text-label shadow-md">
      <span className="text-muted">{entry.label}</span> <span className="font-medium">{entry.value}점</span>
    </div>
  );
}

/** 내 점수 추이 — 목표선(점선) + 주간 점수 라인 */
export function ScoreChart({ scores }: { scores: ScoreEntry[] }) {
  return (
    <figure className="m-0 flex flex-col gap-1.5">
      <div className="aspect-score-chart w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scores} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <XAxis dataKey="label" hide />
            <YAxis domain={DOMAIN} hide />
            <ReferenceLine y={ME.target} stroke="var(--color-accent)" strokeDasharray="3 4" strokeOpacity={0.5} ifOverflow="extendDomain" />
            <Tooltip content={({ active, payload }) => <ScoreTooltip active={active} payload={payload} />} cursor={{ stroke: "var(--color-divider)" }} />
            <Line
              type="linear"
              dataKey="value"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-accent)", stroke: "var(--color-bg)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="flex justify-between text-caption text-neutral-500">
        <span>{scores[0]?.label}</span>
        <span>최근</span>
      </figcaption>
    </figure>
  );
}
