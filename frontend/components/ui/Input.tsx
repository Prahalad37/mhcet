import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export function Input({ label, id, className = "", ...rest }: Props) {
  const inputId =
    id ?? (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
  const input = (
    <input
      id={inputId}
      className={`rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${className}`}
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
