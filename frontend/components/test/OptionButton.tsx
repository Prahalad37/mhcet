"use client";

import { memo } from "react";

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
      className={`flex w-full touch-manipulation gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-[background-color,border-color,box-shadow] duration-150 active:scale-[0.99] ${
        selected
          ? "border-sky-500 bg-sky-50 text-sky-950 ring-1 ring-sky-500 dark:bg-sky-950/40 dark:text-sky-50"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-zinc-800 dark:text-zinc-100">{text}</span>
    </button>
  );
}

export const OptionButton = memo(OptionButtonInner);
