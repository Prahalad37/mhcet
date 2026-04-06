"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { useClientMounted } from "@/lib/useClientMounted";
import type { AttemptHistoryItem } from "@/lib/types";
import { PageEmptyState } from "@/components/ui/PageEmptyState";
import { PageErrorState } from "@/components/ui/PageErrorState";
import { PageLoadingState } from "@/components/ui/PageLoadingState";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AttemptHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useClientMounted();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AttemptHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) {
      redirectToLogin(router, { next: pathname });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<AttemptHistoryItem[]>("/api/attempts", noErrorToast);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) {
            redirectToLogin(router, { next: pathname });
            return;
          }
          setError(
            getUserErrorMessage(e, {
              fallback: "Could not load attempt history.",
            })
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, pathname, reloadTick, router]);

  if (!mounted || !getToken()) {
    return <PageLoadingState label="Checking session" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Attempt history
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          In-progress attempts appear first; then submitted, newest first.
        </p>
      </div>
      {loading ? <PageLoadingState label="Loading attempt history" /> : null}
      {!loading && error ? (
        <PageErrorState
          message={error}
          onRetry={() => setReloadTick((v) => v + 1)}
          backHref="/tests"
          backLabel="Back to tests"
        />
      ) : null}
      {!loading && !error && rows && rows.length === 0 ? (
        <PageEmptyState
          message="No attempts yet. Start your first mock test."
          actionHref="/tests"
          actionLabel="Take a test"
        />
      ) : null}
      {!loading && !error && rows && rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((r) => {
            const inProgress = r.status === "in_progress";
            const total = r.totalQuestions || 1;
            const pct = Math.round(((r.score ?? 0) / total) * 100);
            const href = inProgress
              ? `/tests/${r.testId}/take?attemptId=${r.attemptId}`
              : `/attempts/${r.attemptId}/results`;
            return (
              <li key={r.attemptId}>
                <Link
                  href={href}
                  className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {r.topic}
                      {inProgress ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                          In progress
                        </span>
                      ) : null}
                    </p>
                    <h2 className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                      {r.testTitle}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {inProgress
                        ? `Started ${formatWhen(r.startedAt)}`
                        : `Submitted ${formatWhen(r.submittedAt)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                    {!inProgress ? (
                      <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {r.score ?? 0}/{r.totalQuestions}{" "}
                        <span className="font-normal text-zinc-500">
                          ({pct}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-500">—</span>
                    )}
                    <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                      {inProgress ? "Continue →" : "View results →"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
