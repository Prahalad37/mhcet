import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export function Input({ label, id, className = "", ...rest }: Props) {
  const inputId =
    id ?? (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
  const input = (
    <input
      id={inputId}
      className={`rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-zinc-900 shadow-inner transition-all duration-200 ease-in-out placeholder:text-zinc-400 hover:border-zinc-300 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:border-zinc-200/60 disabled:bg-zinc-50 disabled:text-zinc-500 disabled:opacity-90 dark:border-zinc-700/90 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-sky-500 dark:disabled:border-zinc-800 dark:disabled:bg-zinc-950/80 ${className}`}
      {...rest}
    />
  );
  if (label) {
    return (
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {input}
      </label>
    );
  }
  return input;
}
