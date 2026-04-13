"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PieRow } from "./outcomePieData";

type PieTooltipPayload = { payload?: PieRow };

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: PieTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as PieRow;
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/95">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{row.name}</p>
      <p className="mt-1 tabular-nums text-zinc-600 dark:text-zinc-300">{row.value} questions</p>
    </div>
  );
}

type Props = {
  pieData: PieRow[];
};

/**
 * Recharts is loaded only in this module so the results page can `dynamic(..., { ssr: false })`
 * it — avoids Next/webpack missing chunk errors (e.g. Cannot find module './682.js') during SSR.
 */
export function OutcomePieChart({ pieData }: Props) {
  if (pieData.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-zinc-500">
        No question data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={56}
          outerRadius={96}
          paddingAngle={2}
        >
          {pieData.map((entry, i) => (
            <Cell key={`c-${entry.name}-${i}`} fill={entry.fill} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "12px" }}
          formatter={(value) => (
            <span className="text-zinc-700 dark:text-zinc-300">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export type { PieRow } from "./outcomePieData";
export { COLORS } from "./outcomePieData";
