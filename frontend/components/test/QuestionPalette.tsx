"use client";

import { memo } from "react";

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
  const visitedCount = visited.size;
  const answeredCount = answered.size;
  const markedCount = markedForReview.size;
  const notVisitedCount = Math.max(0, total - visitedCount);

  return (
    <div className="sticky top-2 z-10 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 lg:top-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
            Question palette
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            Jump to any item — same cues as many computer-based tests
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <LegendItem
            label="Active (you are here)"
            className="ring-2 ring-sky-600 ring-offset-2 ring-offset-zinc-50 dark:ring-sky-400 dark:ring-offset-zinc-900"
          />
          <LegendItem
            label={`Not seen (${notVisitedCount})`}
            className="border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950"
          />
          <LegendItem
            label={`Seen (${visitedCount})`}
            className="border-2 border-zinc-400 bg-white dark:border-zinc-500 dark:bg-zinc-950"
          />
          <LegendItem
            label={`Answered (${answeredCount})`}
            className="border border-sky-500 bg-sky-100 dark:border-sky-400 dark:bg-sky-950/80"
          />
          <LegendItem
            label={`Marked (${markedCount})`}
            className="ring-2 ring-amber-400 ring-offset-1 ring-offset-zinc-50 dark:ring-amber-500 dark:ring-offset-zinc-900"
          />
        </div>
      </div>
      <div
        className="-mx-1 flex max-h-[10rem] flex-wrap gap-2 overflow-y-auto overscroll-contain px-1 pb-1 sm:max-h-none"
        role="navigation"
        aria-label="Jump to question"
      >
        {Array.from({ length: total }, (_, i) => {
          const isCurrent = i === currentIndex;
          const isVisited = visited.has(i);
          const isAnswered = answered.has(i);
          const isMarked = markedForReview.has(i);

          let cell =
            "border border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200";
          if (isAnswered) {
            cell =
              "border border-sky-500 bg-sky-100 text-sky-900 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-100";
          } else if (isVisited) {
            cell =
              "border-2 border-zinc-400 bg-white text-zinc-800 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100";
          }

          const markRing = isMarked
            ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-50 dark:ring-amber-500 dark:ring-offset-zinc-900"
            : "";

          const currentRing = isCurrent
            ? "z-[1] ring-2 ring-sky-600 ring-offset-2 ring-offset-zinc-50 dark:ring-sky-400 dark:ring-offset-zinc-900"
            : "";

          const parts = [
            "flex h-10 min-w-[2.5rem] touch-manipulation items-center justify-center rounded-lg text-xs font-semibold transition-[transform,box-shadow,background-color] duration-150 active:scale-[0.97]",
            cell,
            markRing,
            currentRing,
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:brightness-95 dark:hover:brightness-110",
          ]
            .filter(Boolean)
            .join(" ");

          const a11y: string[] = [`Question ${i + 1}`];
          if (isVisited) a11y.push("seen");
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
    </div>
  );
}

export const QuestionPalette = memo(QuestionPaletteInner);
