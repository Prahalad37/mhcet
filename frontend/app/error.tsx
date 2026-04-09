"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50/90 p-6 text-center dark:border-red-900/60 dark:bg-red-950/40">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Something went wrong</h2>
      {process.env.NODE_ENV === "development" && error?.message ? (
        <p className="mt-2 break-words text-left font-mono text-xs text-red-800 dark:text-red-200">{error.message}</p>
      ) : (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Try again or refresh the page.</p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="btn-primary mt-6 px-5 py-2.5 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
