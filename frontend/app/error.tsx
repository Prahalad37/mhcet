"use client";

import { useEffect } from "react";

/**
 * App Router error boundary — ensures Next never falls back to a missing `/_error` chunk
 * (which shows “missing required error components, refreshing…” in dev).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-8 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/40">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
      >
        Try again
      </button>
    </div>
  );
}
