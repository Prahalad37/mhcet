"use client";

import { memo, useState } from "react";

type Props = {
  total: number;
  currentIndex: number;
  visited: Set<number>;
  answered: Set<number>;
  markedForReview: Set<number>;
  disabled?: boolean;
  onSelect: (index: number) => void;
};

function LegendItem({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function QuestionPaletteInner({
  total,
  currentIndex,
  visited,
  answered,
  markedForReview,
  disabled,
  onSelect,
}: Props) {
  const [legendOpen, setLegendOpen] = useState(false);
  const visitedCount = visited.size;
  const answeredCount = answered.size;
  const markedCount = markedForReview.size;
  const notVisitedCount = Math.max(0, total - visitedCount);

  const grid = (
    <div
      className="-mx-1 flex max-h-[min(40vh,14rem)] flex-nowrap gap-2 overflow-x-auto overflow-y-auto overscroll-contain px-1 pb-1 lg:max-h-[min(60vh,22rem)] lg:flex-wrap lg:overflow-x-visible lg:overflow-y-auto"
      role="navigation"
      aria-label="Jump to question"
    >
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === currentIndex;
        const isAnswered = answered.has(i);
        const isMarked = markedForReview.has(i);

        /** Marked for review takes fill priority; then answered; else neutral “not answered”. */
        let cell =
          "border border-zinc-300/90 bg-zinc-100 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100";
        if (isMarked) {
          cell =
            "border border-violet-700 bg-violet-600 text-white shadow-sm dark:border-violet-500 dark:bg-violet-600 dark:text-white";
        } else if (isAnswered) {
          cell =
            "border border-emerald-700 bg-emerald-600 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600 dark:text-white";
        }

        const currentRing = isCurrent
          ? "z-[2] ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950"
          : "";

        const parts = [
          "flex h-11 min-w-[2.75rem] shrink-0 touch-manipulation items-center justify-center rounded-lg text-xs font-bold transition-all duration-200 ease-in-out active:scale-[0.96]",
          cell,
          currentRing,
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:brightness-105 dark:hover:brightness-110",
        ]
          .filter(Boolean)
          .join(" ");

        const a11y: string[] = [`Question ${i + 1}`];
        if (visited.has(i)) a11y.push("seen");
        if (isAnswered) a11y.push("answered");
        if (isMarked) a11y.push("marked for review");
        if (isCurrent) a11y.push("current");

        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            aria-current={isCurrent ? "true" : undefined}
            aria-label={a11y.join(", ")}
            className={parts}
            onClick={() => onSelect(i)}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );

  const legendBlock = (
    <div className="flex flex-wrap gap-x-3 gap-y-2 border-b border-zinc-200/60 pb-3 dark:border-zinc-700/60 lg:border-0 lg:pb-0">
      <LegendItem
        label="Current"
        className="ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900"
      />
      <LegendItem
        label={`Not seen (${notVisitedCount})`}
        className="bg-zinc-200 dark:bg-zinc-700"
      />
      <LegendItem
        label={`Answered (${answeredCount})`}
        className="bg-emerald-600"
      />
      <LegendItem
        label={`Marked (${markedCount})`}
        className="bg-violet-600"
      />
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/50 bg-white/90 p-4 shadow-sm transition-all duration-200 ease-in-out dark:border-zinc-800/50 dark:bg-zinc-950/90 lg:shadow-md">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
            Question palette
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            Tap a number to jump — green = answered, purple = review
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-1.5 text-left text-xs font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
          onClick={() => setLegendOpen((o) => !o)}
          aria-expanded={legendOpen}
        >
          {legendOpen ? "Hide legend" : "Show legend"}
        </button>
      </div>

      <div className="hidden lg:block">{legendBlock}</div>
      {legendOpen ? <div className="lg:hidden">{legendBlock}</div> : null}

      {grid}
    </div>
  );
}

export const QuestionPalette = memo(QuestionPaletteInner);
