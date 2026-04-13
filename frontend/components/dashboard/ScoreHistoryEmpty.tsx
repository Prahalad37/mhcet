import Link from "next/link";

/** Empty analytics placeholder for first-time users (no Recharts — keep out of chart chunk). */
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
