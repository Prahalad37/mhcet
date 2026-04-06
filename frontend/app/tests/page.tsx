"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { useClientMounted } from "@/lib/useClientMounted";
import type {
  AnalyticsInsights,
  AppConfig,
  AttemptHistoryItem,
  TestSummary,
} from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { PageEmptyState } from "@/components/ui/PageEmptyState";
import { PageErrorState } from "@/components/ui/PageErrorState";
import { PageLoadingState } from "@/components/ui/PageLoadingState";

export default function TestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useClientMounted();
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [resumeByTestId, setResumeByTestId] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

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
      setWarning(null);
      try {
        const [testsData, cfg] = await Promise.all([
          api<TestSummary[]>("/api/tests", noErrorToast),
          api<AppConfig>("/api/config", noErrorToast).catch(() => null),
        ]);
        if (!cancelled) {
          setTests(testsData);
          setAppConfig(cfg);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) {
            redirectToLogin(router, { next: pathname });
            return;
          }
          setError(
            getUserErrorMessage(e, { fallback: "Could not load tests." })
          );
          setLoading(false);
        }
        return;
      }
      const warnings: string[] = [];
      try {
        const insightData = await api<AnalyticsInsights>(
          "/api/analytics/insights",
          noErrorToast
        );
        if (!cancelled) setInsights(insightData);
      } catch (e) {
        warnings.push(
          getUserErrorMessage(e, {
            fallback: "Analytics are temporarily unavailable.",
          })
        );
      }
      try {
        const history = await api<AttemptHistoryItem[]>("/api/attempts", noErrorToast);
        if (!cancelled) {
          const map: Record<string, string> = {};
          for (const row of history) {
            if (row.status === "in_progress") map[row.testId] = row.attemptId;
          }
          setResumeByTestId(map);
        }
      } catch (e) {
        warnings.push(
          getUserErrorMessage(e, {
            fallback: "Could not load in-progress attempts.",
          })
        );
      } finally {
        if (!cancelled) {
          if (warnings.length > 0) setWarning(warnings[0]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, pathname, reloadTick, router]);

  if (!mounted || !getToken()) {
    return <PageLoadingState label="Checking session" />;
  }

  const recommendedIds = new Set(
    (insights?.recommendedTests ?? []).map((t) => t.id)
  );

  const canStartNewMock = appConfig?.canStartMock !== false;
  const cap = appConfig?.freeTestsPerDay ?? 2;
  const used = appConfig?.testsTodayUtc ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Available tests
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Each attempt is timed. Submit when you are done to see detailed
          results. We highlight weak topics and suggest what to try next.
        </p>
        {appConfig?.plan === "free" ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Free plan: {used} / {cap} full mocks started today (UTC). Paid accounts have unlimited
            mocks.
          </p>
        ) : null}
      </div>

      {!canStartNewMock ? (
        <div
          className="rounded-2xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <p className="font-medium">Daily mock limit reached</p>
          <p className="mt-1 text-xs opacity-90">
            You can still open an in-progress attempt from below. New starts reset at UTC
            midnight, or ask for a paid account.
          </p>
        </div>
      ) : null}

      {insights && insights.insightMessage ? (
        <div
          className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100"
          role="status"
        >
          <p className="font-medium">{insights.insightMessage}</p>
          <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
            Recommendations below prioritize tests in those topics—especially
            ones you haven&apos;t taken or scored lower on.
          </p>
        </div>
      ) : null}

      {insights && insights.topicStats.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Performance by topic
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {insights.topicStats.map((s) => (
              <li
                key={s.topic}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {s.topic}
                </span>
                <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                  {Math.round(s.accuracy * 100)}% ({s.correct}/{s.attempted})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {insights && insights.recommendedTests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Recommended for you
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {insights.recommendedTests.map((t) => (
              <li
                key={t.id}
                className="flex flex-col rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/30"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  {t.topic}
                </span>
                <h3 className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">
                  {t.title}
                </h3>
                <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                  {t.reason}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {t.questionCount} questions ·{" "}
                  {Math.ceil(t.durationSeconds / 60)} min
                </p>
                {canStartNewMock ? (
                  <Link
                    href={`/tests/${t.id}/take`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto"
                  >
                    Start test
                  </Link>
                ) : (
                  <span
                    className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 sm:w-auto"
                    title="Daily mock limit reached"
                  >
                    Limit reached
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {warning ? <Alert message={warning} variant="info" /> : null}
      {loading ? <PageLoadingState label="Loading tests" /> : null}
      {!loading && error ? (
        <PageErrorState
          message={error}
          onRetry={() => setReloadTick((v) => v + 1)}
          backHref="/"
          backLabel="Back home"
        />
      ) : null}
      {!loading && !error && tests && tests.length === 0 ? (
        <PageEmptyState
          message="No tests are published yet."
          actionHref="/attempts"
          actionLabel="Open attempt history"
        />
      ) : null}

      {!loading && !error && tests && tests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            All tests
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {tests.map((t) => {
              const resumeId = resumeByTestId[t.id];
              return (
              <li
                key={t.id}
                className={`flex flex-col rounded-2xl border p-5 shadow-sm dark:bg-zinc-950 ${
                  recommendedIds.has(t.id)
                    ? "border-emerald-200/80 bg-white dark:border-emerald-900/50"
                    : "border-zinc-200 bg-white dark:border-zinc-800"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {t.topic}
                </span>
                <h2 className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">
                  {t.title}
                </h2>
                {recommendedIds.has(t.id) ? (
                  <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Recommended for your level
                  </p>
                ) : null}
                {t.description ? (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {t.description}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-zinc-500">
                  {t.questionCount} questions ·{" "}
                  {Math.ceil(t.durationSeconds / 60)} min
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {resumeId ? (
                    <Link
                      href={`/tests/${t.id}/take?attemptId=${resumeId}`}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-950 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60 sm:w-auto"
                    >
                      Continue attempt
                    </Link>
                  ) : null}
                  {canStartNewMock ? (
                    <Link
                      href={`/tests/${t.id}/take`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 sm:w-auto"
                    >
                      Start new attempt
                    </Link>
                  ) : (
                    <span
                      className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-500 shadow-sm dark:bg-zinc-800 dark:text-zinc-400 sm:w-auto"
                      title="Daily mock limit reached"
                    >
                      Start new attempt
                    </span>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
