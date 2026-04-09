"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Variant = "indigo" | "emerald" | "violet" | "amber" | "rose";

const shell: Record<
  Variant,
  string
> = {
  indigo:
    "border-indigo-200/60 bg-gradient-to-br from-indigo-50/95 via-white to-white dark:border-indigo-800/40 dark:from-indigo-950/50 dark:via-zinc-950 dark:to-zinc-950",
  emerald:
    "border-emerald-200/60 bg-gradient-to-br from-emerald-50/95 via-white to-white dark:border-emerald-800/40 dark:from-emerald-950/45 dark:via-zinc-950 dark:to-zinc-950",
  violet:
    "border-violet-200/60 bg-gradient-to-br from-violet-50/95 via-white to-white dark:border-violet-800/40 dark:from-violet-950/45 dark:via-zinc-950 dark:to-zinc-950",
  amber:
    "border-amber-200/60 bg-gradient-to-br from-amber-50/95 via-white to-white dark:border-amber-800/40 dark:from-amber-950/40 dark:via-zinc-950 dark:to-zinc-950",
  rose:
    "border-rose-200/60 bg-gradient-to-br from-rose-50/95 via-white to-white dark:border-rose-800/40 dark:from-rose-950/45 dark:via-zinc-950 dark:to-zinc-950",
};

const iconBg: Record<Variant, string> = {
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300",
};

export function AdminStatCard({
  title,
  value,
  subtitle,
  href,
  icon: Icon,
  variant = "indigo",
}: {
  title: string;
  value: number;
  subtitle?: string;
  href?: string;
  icon: LucideIcon;
  variant?: Variant;
}) {
  const inner = (
    <div
      className={`rounded-xl border p-5 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md ${shell[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
            {value.toLocaleString()}
          </p>
          {subtitle ? (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg[variant]}`}
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
