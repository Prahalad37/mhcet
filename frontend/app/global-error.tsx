"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans antialiased dark:bg-zinc-950">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Application error</h1>
          {process.env.NODE_ENV === "development" && error?.message ? (
            <p className="mt-3 break-words text-left font-mono text-xs text-red-700 dark:text-red-300">{error.message}</p>
          ) : (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">An unexpected error occurred.</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
