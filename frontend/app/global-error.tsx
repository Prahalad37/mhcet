"use client";

/**
 * Root-level fallback when the root layout fails. Must define `<html>` and `<body>`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 p-8 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50/90 p-8 dark:border-rose-900/50 dark:bg-rose-950/40">
          <h1 className="text-lg font-semibold">Application error</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {error.message || "The app failed to load."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
