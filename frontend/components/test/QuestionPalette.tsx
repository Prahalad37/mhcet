"use client";

import { memo, useMemo, useState } from "react";
import {
  countAnsweredInSection,
  type ExamSection,
} from "@/lib/examSections";
import { useLocale } from "@/components/providers/LocaleProvider";

type Props = {
  total: number;
  currentIndex: number;
  visited: Set<number>;
  answered: Set<number>;
  markedForReview: Set<number>;
  disabled?: boolean;
  onSelect: (index: number) => void;
  /** When set and length > 1, palette is grouped by section (paper order). */
  sections?: ExamSection[] | null;
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

function PaletteCell({
  i,
  currentIndex,
  visited,
  answered,
  markedForReview,
  disabled,
  onSelect,
}: {
  i: number;
  currentIndex: number;
  visited: Set<number>;
  answered: Set<number>;
  markedForReview: Set<number>;
  disabled?: boolean;
  onSelect: (index: number) => void;
}) {
  const { t: tr } = useLocale();
  const isCurrent = i === currentIndex;
  const isAnswered = answered.has(i);
  const isMarked = markedForReview.has(i);

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
    "flex h-10 min-w-[2.5rem] shrink-0 touch-manipulation items-center justify-center rounded-md text-[11px] font-bold transition-all duration-200 ease-in-out active:scale-[0.96] lg:h-11 lg:min-w-[2.75rem] lg:rounded-lg lg:text-xs",
    cell,
    currentRing,
    disabled
      ? "cursor-not-allowed opacity-50"
      : "cursor-pointer hover:brightness-105 dark:hover:brightness-110",
  ]
    .filter(Boolean)
    .join(" ");

  const a11y: string[] = [tr("palette.a11yQuestion", { n: i + 1 })];
  if (visited.has(i)) a11y.push(tr("palette.a11ySeen"));
  if (isAnswered) a11y.push(tr("palette.a11yAnswered"));
  if (isMarked) a11y.push(tr("palette.a11yMarked"));
  if (isCurrent) a11y.push(tr("palette.a11yCurrent"));

  return (
    <button
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
}

function sectionCells(
  sec: ExamSection,
  gridClass: string,
  props: Omit<Props, "total" | "sections">
) {
  return (
    <div className={`${gridClass} max-h-none lg:max-h-none`}>
      {Array.from(
        { length: sec.endIndex - sec.startIndex + 1 },
        (_, k) => sec.startIndex + k
      ).map((i) => (
        <PaletteCell
          key={i}
          i={i}
          currentIndex={props.currentIndex}
          visited={props.visited}
          answered={props.answered}
          markedForReview={props.markedForReview}
          disabled={props.disabled}
          onSelect={props.onSelect}
        />
      ))}
    </div>
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
  sections,
}: Props) {
  const { t: tr } = useLocale();
  const [legendOpen, setLegendOpen] = useState(false);

  const visitedCount = visited.size;
  const answeredCount = answered.size;
  const markedCount = markedForReview.size;
  const notVisitedCount = Math.max(0, total - visitedCount);

  const useGroups =
    sections != null && sections.length > 1 && total > 0;

  const currentSection = useMemo(() => {
    if (!sections?.length) return null;
    return (
      sections.find(
        (s) => currentIndex >= s.startIndex && currentIndex <= s.endIndex
      ) ?? sections[0]
    );
  }, [sections, currentIndex]);

  const legendBlock = (
    <div className="flex flex-wrap gap-x-3 gap-y-2 border-b border-zinc-200/60 pb-3 dark:border-zinc-700/60 lg:border-0 lg:pb-0">
      <LegendItem
        label={tr("palette.current")}
        className="ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900"
      />
      <LegendItem
        label={tr("palette.notSeen", { n: notVisitedCount })}
        className="bg-zinc-200 dark:bg-zinc-700"
      />
      <LegendItem
        label={tr("palette.answeredLegend", { n: answeredCount })}
        className="bg-emerald-600"
      />
      <LegendItem
        label={tr("palette.markedLegend", { n: markedCount })}
        className="bg-violet-600"
      />
    </div>
  );

  const gridClass =
    "-mx-1 flex max-h-[min(32vh,10.5rem)] flex-nowrap gap-1.5 overflow-x-auto overflow-y-auto overscroll-contain px-1 pb-0.5 lg:max-h-[min(60vh,22rem)] lg:gap-2 lg:pb-1 lg:flex-wrap lg:overflow-x-visible lg:overflow-y-auto";

  const cellProps = {
    currentIndex,
    visited,
    answered,
    markedForReview,
    disabled,
    onSelect,
  };

  const flatGrid = (
    <div
      className={gridClass}
      role="navigation"
      aria-label={tr("palette.jumpQuestion")}
    >
      {Array.from({ length: total }, (_, i) => (
        <PaletteCell
          key={i}
          i={i}
          {...cellProps}
        />
      ))}
    </div>
  );

  /** Desktop: all sections expanded in one scroll area. Only build when grouped mode — otherwise
   *  `sections` is null and eager JSX evaluation would call `.map` on null. */
  const groupedGridsDesktop =
    useGroups && sections ? (
      <div
        className="hidden max-h-[min(65vh,26rem)] space-y-4 overflow-y-auto overscroll-contain px-0.5 pb-1 lg:block"
        role="navigation"
        aria-label={tr("palette.jumpBySection")}
      >
        {sections.map((sec) => {
          const from = sec.startIndex + 1;
          const to = sec.endIndex + 1;
          return (
            <section
              key={sec.id}
              aria-label={tr("palette.sectionAria", {
                label: sec.label,
                from,
                to,
              })}
              className="space-y-2"
            >
              <h3 className="truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                <span className="text-zinc-800 dark:text-zinc-200">
                  {sec.label}
                </span>
                <span className="ml-1.5 font-normal normal-case text-zinc-500 dark:text-zinc-500">
                  {tr("palette.qRange", { from, to })}
                </span>
              </h3>
              {sectionCells(sec, gridClass, cellProps)}
            </section>
          );
        })}
      </div>
    ) : null;

  /** Mobile: only the current section’s numbers — section switching is on the take page. */
  const groupedGridMobile = currentSection ? (
    <div
      className="space-y-1.5 lg:hidden"
      role="navigation"
      aria-label={tr("palette.jumpInSection", {
        label: currentSection.label,
      })}
    >
      <p className="truncate text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
        {tr("palette.mobileMeta", {
          label: currentSection.label,
          from: currentSection.startIndex + 1,
          to: currentSection.endIndex + 1,
          answered: countAnsweredInSection(currentSection, answered),
          total: currentSection.endIndex - currentSection.startIndex + 1,
        })}
      </p>
      {sectionCells(currentSection, gridClass, cellProps)}
    </div>
  ) : null;

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200/50 bg-white/90 p-3 shadow-sm transition-all duration-200 ease-in-out dark:border-zinc-800/50 dark:bg-zinc-950/90 lg:space-y-3 lg:p-4 lg:shadow-md">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300 lg:text-xs">
            {tr("palette.title")}
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400 lg:text-[11px]">
            {useGroups ? (
              <>
                <span className="lg:hidden">{tr("palette.helpGroupMobile")}</span>
                <span className="hidden lg:inline">
                  {tr("palette.helpGroupDesktop")}
                </span>
              </>
            ) : (
              tr("palette.helpFlat")
            )}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-left text-[11px] font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
          onClick={() => setLegendOpen((o) => !o)}
          aria-expanded={legendOpen}
        >
          {legendOpen ? tr("palette.legendHide") : tr("palette.legendShow")}
        </button>
      </div>

      <div className="hidden lg:block">{legendBlock}</div>
      {legendOpen ? <div className="lg:hidden">{legendBlock}</div> : null}

      {useGroups ? (
        <>
          {groupedGridMobile}
          {groupedGridsDesktop}
        </>
      ) : (
        flatGrid
      )}
    </div>
  );
}

export const QuestionPalette = memo(QuestionPaletteInner);
