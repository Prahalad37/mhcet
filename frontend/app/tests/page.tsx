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
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Available Tests
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          You’ll open brief instructions first; the timer starts only after you pick
          a mode. Submit when done for scored results and topic insights.
        </p>
        {appConfig?.plan === "free" ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
            <span>⚡</span>
            Free plan: {used} / {cap} mocks today · Resets midnight UTC
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
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            <span className="text-base">🎯</span> Recommended for you
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {insights.recommendedTests.map((t, i) => (
              <li
                key={t.id}
                className={`glass-card fade-up flex flex-col p-5`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <span className="inline-flex w-fit items-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {t.topic}
                </span>
                <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">{t.title}</h3>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{t.reason}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  {t.questionCount} questions · {Math.ceil(t.durationSeconds / 60)} min
                </p>
                {canStartNewMock ? (
                  <Link
                    href={`/tests/${t.id}/take`}
                    className="btn-primary mt-4 w-full !justify-center !py-2"
                  >
                    Instructions &amp; start →
                  </Link>
                ) : (
                  <span className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-400 dark:bg-zinc-800">
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
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">All tests</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {tests.map((t, i) => {
              const resumeId = resumeByTestId[t.id];
              const isRec = recommendedIds.has(t.id);
              return (
                <li
                  key={t.id}
                  className={`glass-card fade-up flex flex-col p-5 ${isRec ? "border-indigo-200/80 dark:border-indigo-800/50" : ""}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {t.topic}
                    </span>
                    {isRec && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        ★ Recommended
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">{t.title}</h2>
                  {t.description ? (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">{t.description}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-zinc-400">
                    {t.questionCount} questions · {Math.ceil(t.durationSeconds / 60)} min
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {resumeId ? (
                      <Link
                        href={`/tests/${t.id}/take?attemptId=${resumeId}`}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 sm:w-auto"
                      >
                        ↩ Continue attempt
                      </Link>
                    ) : null}
                    {canStartNewMock ? (
                      <Link
                        href={`/tests/${t.id}/take`}
                        className="btn-primary w-full !justify-center !py-2.5 sm:w-auto"
                      >
                        Instructions &amp; start →
                      </Link>
                    ) : (
                      <span
                        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-400 dark:bg-zinc-800 sm:w-auto"
                        title="Daily mock limit reached"
                      >
                        Instructions &amp; start
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
