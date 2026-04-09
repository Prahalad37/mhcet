"use client";

import { memo } from "react";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

type Props = {
  label: string;
  text: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

function OptionButtonInner({
  label,
  text,
  selected,
  disabled,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full cursor-pointer touch-manipulation gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 ease-in-out active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? "border-indigo-600 bg-indigo-50/95 text-zinc-900 shadow-sm ring-2 ring-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-zinc-50 dark:ring-indigo-400/25"
          : "border-zinc-200/90 bg-white hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-700/90 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/80"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-200 ${
          selected
            ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500"
            : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
        }`}
      >
        {label}
      </span>
      <span className="min-w-0 flex-1 text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
        <MarkdownRenderer
          content={text}
          className="prose prose-sm max-w-none leading-relaxed text-zinc-800 dark:prose-invert dark:text-zinc-200"
        />
      </span>
    </button>
  );
}

export const OptionButton = memo(OptionButtonInner);
