"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { useClientMounted } from "@/lib/useClientMounted";
import { getAdminTests } from "@/lib/myMocksApi";
import type {
  AdminTest,
  AnalyticsInsights,
  AppConfig,
  AttemptHistoryItem,
  TestSummary,
} from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { PageEmptyState } from "@/components/ui/PageEmptyState";
import { PageErrorState } from "@/components/ui/PageErrorState";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function TestsPage() {
  const { t: tr } = useLocale();
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
  const [myMocks, setMyMocks] = useState<AdminTest[] | null>(null);

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
        const [testsData, cfg, owned] = await Promise.all([
          api<TestSummary[]>("/api/tests", noErrorToast),
          api<AppConfig>("/api/config", noErrorToast).catch(() => null),
          getAdminTests().catch(() => [] as AdminTest[]),
        ]);
        if (!cancelled) {
          setTests(testsData);
          setAppConfig(cfg);
          setMyMocks(owned);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) {
            redirectToLogin(router, { next: pathname });
            return;
          }
          setError(
            getUserErrorMessage(e, { fallback: tr("tests.errLoadTests") })
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
            fallback: tr("tests.errAnalytics"),
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
            fallback: tr("tests.errHistory"),
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
  }, [mounted, pathname, reloadTick, router, tr]);

  if (!mounted || !getToken()) {
    return <PageLoadingState label={tr("tests.checkingSession")} />;
  }

  const recommendedIds = new Set(
    (insights?.recommendedTests ?? []).map((t) => t.id)
  );

  const canStartNewMock = appConfig?.canStartMock !== false;
  const cap = appConfig?.freeTestsPerDay ?? 2;
  const used = appConfig?.testsTodayUtc ?? 0;

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          {tr("tests.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {tr("tests.subtitleLead")}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
            {tr("tests.subtitleMocksLabel")}
          </strong>
          {tr("tests.subtitleTrail")}
        </p>
        {appConfig?.plan === "free" ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
            <span>⚡</span>
            {tr("tests.freePlan", { used, cap })}
          </p>
        ) : null}
      </div>

      {!canStartNewMock ? (
        <div
          className="rounded-2xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <p className="font-medium">{tr("tests.limitBanner")}</p>
          <p className="mt-1 text-xs opacity-90">{tr("tests.limitDetail")}</p>
        </div>
      ) : null}

      {insights && insights.insightMessage ? (
        <div
          className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100"
          role="status"
        >
          <p className="font-medium">{insights.insightMessage}</p>
          <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
            {tr("tests.analyticsHint")}
          </p>
        </div>
      ) : null}

      {insights && insights.topicStats.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {tr("tests.performanceTopic")}
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
            <span className="text-base">🎯</span> {tr("tests.recommendedTitle")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {insights.recommendedTests.map((row, i) => (
              <li
                key={row.id}
                className={`glass-card fade-up flex flex-col p-5`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <span className="inline-flex w-fit items-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {row.topic}
                </span>
                <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">{row.title}</h3>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{row.reason}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  {tr("tests.qMeta", {
                    count: row.questionCount,
                    mins: Math.ceil(row.durationSeconds / 60),
                  })}
                </p>
                {canStartNewMock ? (
                  <Link
                    href={`/tests/${row.id}/take`}
                    className="btn-primary mt-4 w-full !justify-center !py-2"
                  >
                    {tr("tests.instructionsStart")}
                  </Link>
                ) : (
                  <span className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-400 dark:bg-zinc-800">
                    {tr("tests.limitReached")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!loading && !error && myMocks && myMocks.length > 0 ? (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            <span className="text-base">📋</span> {tr("tests.yourMocksTitle")}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {tr("tests.yourMocksHelpBefore")}
            <Link href="/my-mocks" className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
              {tr("nav.myMocks")}
            </Link>
            {tr("tests.yourMocksHelpAfter")}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {myMocks.map((row, i) => {
              const resumeId = resumeByTestId[row.id];
              const active = row.isActive;
              return (
                <li
                  key={row.id}
                  className="glass-card fade-up flex flex-col border-violet-200/60 p-5 dark:border-violet-900/40"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-lg bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-800 dark:bg-violet-950/60 dark:text-violet-200">
                      {row.topic}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        active
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      {active ? tr("tests.active") : tr("tests.draft")}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">{row.title}</h3>
                  {row.description ? (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {row.description}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-zinc-400">
                    {tr("tests.qMeta", {
                      count: row.questionCount,
                      mins: Math.ceil(row.durationSeconds / 60),
                    })}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {active && resumeId ? (
                      <Link
                        href={`/tests/${row.id}/take?attemptId=${resumeId}`}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 sm:w-auto"
                      >
                        ↩ {tr("tests.continueAttempt")}
                      </Link>
                    ) : null}
                    {active && canStartNewMock ? (
                      <Link
                        href={`/tests/${row.id}/take`}
                        className="btn-primary w-full !justify-center !py-2.5 sm:w-auto"
                      >
                        {tr("tests.instructionsStart")}
                      </Link>
                    ) : null}
                    {active && !canStartNewMock ? (
                      <span
                        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-400 dark:bg-zinc-800 sm:w-auto"
                        title={tr("tests.limitBanner")}
                      >
                        {tr("tests.instructionsStartPlain")}
                      </span>
                    ) : null}
                    {!active ? (
                      <Link
                        href={`/my-mocks/${row.id}/edit`}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-900 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100 sm:w-auto"
                      >
                        {tr("tests.editActivate")}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {warning ? <Alert message={warning} variant="info" /> : null}
      {loading ? <PageLoadingState label={tr("tests.loading")} /> : null}
      {!loading && error ? (
        <PageErrorState
          message={error}
          onRetry={() => setReloadTick((v) => v + 1)}
          backHref="/"
          backLabel={tr("tests.backHome")}
        />
      ) : null}
      {!loading && !error && tests && tests.length === 0 ? (
        <PageEmptyState
          message={tr("tests.empty")}
          actionHref="/attempts"
          actionLabel={tr("tests.emptyAction")}
        />
      ) : null}

      {!loading && !error && tests && tests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{tr("tests.allTests")}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {tests.map((row, i) => {
              const resumeId = resumeByTestId[row.id];
              const isRec = recommendedIds.has(row.id);
              return (
                <li
                  key={row.id}
                  className={`glass-card fade-up flex flex-col p-5 ${isRec ? "border-indigo-200/80 dark:border-indigo-800/50" : ""}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {row.topic}
                    </span>
                    {isRec && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        ★ {tr("tests.recommendedBadge")}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">{row.title}</h2>
                  {row.description ? (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">{row.description}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-zinc-400">
                    {tr("tests.qMeta", {
                      count: row.questionCount,
                      mins: Math.ceil(row.durationSeconds / 60),
                    })}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {resumeId ? (
                      <Link
                        href={`/tests/${row.id}/take?attemptId=${resumeId}`}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 sm:w-auto"
                      >
                        ↩ {tr("tests.continueAttempt")}
                      </Link>
                    ) : null}
                    {canStartNewMock ? (
                      <Link
                        href={`/tests/${row.id}/take`}
                        className="btn-primary w-full !justify-center !py-2.5 sm:w-auto"
                      >
                        {tr("tests.instructionsStart")}
                      </Link>
                    ) : (
                      <span
                        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-400 dark:bg-zinc-800 sm:w-auto"
                        title={tr("tests.limitBanner")}
                      >
                        {tr("tests.instructionsStartPlain")}
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
