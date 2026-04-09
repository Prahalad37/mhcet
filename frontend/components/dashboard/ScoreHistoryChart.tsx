"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { RecentAttempt } from "@/lib/dashboardApi";

const STROKE = "#6366f1";
const GRID_STROKE = "#f4f4f5";

type Row = {
  slot: string;
  label: string;
  accuracy: number;
};

function GlassTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/95">
      <p className="max-w-[220px] font-semibold text-zinc-900 dark:text-zinc-50">
        {row.label}
      </p>
      <p className="mt-1 tabular-nums text-indigo-600 dark:text-indigo-400">
        Score: {row.accuracy}%
      </p>
    </div>
  );
}

export function ScoreHistoryChart({ attempts }: { attempts: RecentAttempt[] }) {
  const gradId = useId().replace(/:/g, "");
  const data = useMemo(() => {
    return [...attempts]
      .sort(
        (a, b) =>
          new Date(a.submittedAt).getTime() -
          new Date(b.submittedAt).getTime()
      )
      .map((a, i) => {
        const acc =
          a.accuracy ??
          (a.total > 0 ? Math.round((a.score / a.total) * 100) : 0);
        const label =
          a.title.length > 40 ? `${a.title.slice(0, 40)}…` : a.title;
        return {
          slot: `#${i + 1}`,
          label,
          accuracy: Math.min(100, Math.max(0, acc)),
        };
      });
  }, [attempts]);

  if (data.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Mock test scores
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Recent attempts · accuracy %
          </p>
        </div>
        <Link
          href="/attempts"
          className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Full history →
        </Link>
      </div>
      <div className="h-[min(280px,42vh)] w-full min-h-[200px] [&_.recharts-surface]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={STROKE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={STROKE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={GRID_STROKE}
              vertical={false}
            />
            <XAxis
              dataKey="slot"
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-zinc-500 dark:text-zinc-400"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              width={32}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-zinc-500 dark:text-zinc-400"
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={<GlassTooltip />}
              cursor={{
                stroke: "#a5b4fc",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="accuracy"
              stroke={STROKE}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              name="Accuracy %"
              dot={{ r: 3, fill: STROKE, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: STROKE, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Empty analytics placeholder for first-time users */
export function ScoreHistoryEmpty() {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center sm:py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-2xl dark:from-indigo-950/80 dark:to-violet-950/60">
        📊
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Take your first mock test to see your analytics
        </p>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Your score trend will appear here after you submit a timed mock. Head
          to Tests to get started.
        </p>
      </div>
      <Link
        href="/tests"
        className="btn-primary mt-1 !px-5 !py-2 !text-sm"
      >
            Browse tests →
      </Link>
    </div>
  );
}
