"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { useClientMounted } from "@/lib/useClientMounted";
import type {
  AnalyticsInsights,
  AppConfig,
  ResultsResponse,
} from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageEmptyState } from "@/components/ui/PageEmptyState";
import { PageErrorState } from "@/components/ui/PageErrorState";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StaticExplanationModal } from "@/components/results/StaticExplanationModal";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";


type StaticExplainState = { label: string; officialExplanation: string };

function formatSubmittedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

type QuestionOutcome = "correct" | "wrong" | "unanswered";

function outcomeForQuestion(q: ResultsResponse["questions"][number]): QuestionOutcome {
  if (q.isCorrect === true) return "correct";
  if (q.selectedOption) return "wrong";
  return "unanswered";
}

export default function ResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useClientMounted();

  const [data, setData] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [staticExplainFor, setStaticExplainFor] =
    useState<StaticExplainState | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) {
      redirectToLogin(router, { next: pathname });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api<ResultsResponse>(
          `/api/attempts/${attemptId}/results`,
          noErrorToast
        );
        if (!cancelled) setData(res);
        try {
          const cfg = await api<AppConfig>("/api/config", noErrorToast);
          if (!cancelled) setConfig(cfg);
        } catch {
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) {
            redirectToLogin(router, { next: pathname });
            return;
          }
          setError(getUserErrorMessage(e, { fallback: "Could not load results." }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, attemptId, pathname, router, reloadTick]);

  useEffect(() => {
    if (!mounted || !getToken() || !data) return;
    let cancelled = false;
    (async () => {
      try {
        const insightData = await api<AnalyticsInsights>(
          "/api/analytics/insights",
          noErrorToast
        );
        if (!cancelled) setInsights(insightData);
      } catch (e) {
        if (!cancelled) {
          setWarning(
            getUserErrorMessage(e, {
              fallback: "Analytics are temporarily unavailable.",
            })
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, data]);

  if (!mounted || !getToken()) return <PageLoadingState label="Checking session" />;

  if (loading) return <PageLoadingState label="Loading results" />;

  if (error || !data) {
    if (error) {
      return (
        <PageErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setReloadTick((v) => v + 1);
          }}
          backHref="/tests"
          backLabel="Back to tests"
        />
      );
    }
    return (
      <PageEmptyState
        message="Results are not available for this attempt yet."
        actionHref="/attempts"
        actionLabel="Back to history"
      />
    );
  }

  const pct =
    data.totalQuestions > 0
      ? Math.round((data.score / data.totalQuestions) * 100)
      : 0;

  const correctCount = data.questions.filter((q) => q.isCorrect === true).length;
  const wrongCount = data.questions.filter(
    (q) => q.selectedOption && q.isCorrect !== true
  ).length;
  const unansweredCount = data.questions.filter((q) => !q.selectedOption).length;


  const anyStaticExplain = data.questions.some(
    (q) =>
      !!(q.officialExplanation && String(q.officialExplanation).trim())
  );

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 bg-gradient-to-br from-sky-50/90 to-white px-6 py-5 dark:border-zinc-800 dark:from-sky-950/30 dark:to-zinc-950">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
            {data.testTitle}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Attempt summary
          </h1>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Accuracy
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {pct}
              <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                %
              </span>
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {data.score}
              </span>{" "}
              correct out of{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {data.totalQuestions}
              </span>{" "}
              questions
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
              <span
                className="h-2 w-2 rounded-full bg-emerald-500"
                aria-hidden
              />
              {correctCount} right
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
              <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
              {wrongCount} wrong
            </span>
            {unansweredCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                <span
                  className="h-2 w-2 rounded-full bg-zinc-400"
                  aria-hidden
                />
                {unansweredCount} skipped
              </span>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 border-t border-zinc-100 px-6 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:grid-cols-2">
          <div>
            <span className="text-zinc-500 dark:text-zinc-500">Submitted</span>
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              {formatSubmittedAt(data.submittedAt)}
            </p>
          </div>
          <div>
            <span className="text-zinc-500 dark:text-zinc-500">
              Time allowed (this mock)
            </span>
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              {formatDuration(data.durationSeconds)}
            </p>
          </div>
        </div>
        <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <Link href="/tests">
            <Button variant="secondary">Take another test</Button>
          </Link>
        </div>
      </div>

      {warning ? <Alert message={warning} variant="info" /> : null}

      {insights && (insights.insightMessage || insights.topicStats.length > 0) ? (
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Your analytics
          </h2>
          {insights.insightMessage ? (
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {insights.insightMessage}
            </p>
          ) : null}
          {insights.topicStats.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {insights.topicStats.map((s) => (
                <li
                  key={s.topic}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {s.topic}
                  </span>{" "}
                  <span className="text-zinc-500">
                    {Math.round(s.accuracy * 100)}% ({s.correct}/{s.attempted})
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            href="/tests"
            className="inline-block text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            View recommended tests →
          </Link>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Review
        </h2>
          {anyStaticExplain ? (
            <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              Built-in <strong className="text-zinc-800 dark:text-zinc-200">Explanation</strong> blocks appear under each question; use{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                Open explanation full screen
              </strong>{" "}
              for a larger view.
            </p>
          ) : null}
        <ul className="space-y-4">
          {data.questions.map((q, idx) => {
            const outcome = outcomeForQuestion(q);
            const borderClass =
              outcome === "correct"
                ? "border-l-emerald-500"
                : outcome === "wrong"
                  ? "border-l-red-500"
                  : "border-l-zinc-400 dark:border-l-zinc-500";
            const badgeClass =
              outcome === "correct"
                ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-500/25 dark:bg-emerald-950/60 dark:text-emerald-100"
                : outcome === "wrong"
                  ? "bg-red-100 text-red-900 ring-1 ring-red-500/25 dark:bg-red-950/50 dark:text-red-100"
                  : "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-400/30 dark:bg-zinc-800 dark:text-zinc-100";
            const badgeLabel =
              outcome === "correct"
                ? "Correct"
                : outcome === "wrong"
                  ? "Wrong"
                  : "Skipped";
            const optionRows = [
              { key: "A" as const, text: q.optionA },
              { key: "B" as const, text: q.optionB },
              { key: "C" as const, text: q.optionC },
              { key: "D" as const, text: q.optionD },
            ];
            const staticText = q.officialExplanation?.trim() ?? "";

            return (
              <li
                key={q.id}
                className={`rounded-2xl border border-zinc-200 border-l-4 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${borderClass}`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Question {idx + 1}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                  <div className="mt-3 font-medium text-zinc-900 dark:text-zinc-50">
                    <MarkdownRenderer content={q.prompt} />
                  </div>
                  <ul className="mt-4 space-y-2">
                    {optionRows.map(({ key: letter, text: optText }) => {
                      const isAnswer = letter === q.correctOption;
                      const isPick = q.selectedOption === letter;
                      let rowClass =
                        "border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40";
                      if (isAnswer) {
                        rowClass =
                          "border-emerald-300 bg-emerald-50 dark:border-emerald-800/70 dark:bg-emerald-950/35";
                      } else if (isPick && !isAnswer) {
                        rowClass =
                          "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/35";
                      }
                      return (
                        <li
                          key={letter}
                          className={`flex gap-3 rounded-xl border px-3 py-2.5 text-sm ${rowClass}`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isAnswer
                                ? "bg-emerald-600 text-white dark:bg-emerald-600"
                                : isPick && !isAnswer
                                  ? "bg-red-600 text-white dark:bg-red-600"
                                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="min-w-0 flex-1 text-zinc-800 dark:text-zinc-200">
                            <MarkdownRenderer content={optText} />
                          </span>
                          {isAnswer ? (
                            <span className="shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              Correct
                            </span>
                          ) : null}
                          {isPick && !isAnswer ? (
                            <span className="shrink-0 text-xs font-semibold text-red-700 dark:text-red-300">
                              Your pick
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  {q.hint?.trim() ? (
                    <p className="mt-3 rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-sm text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100">
                      <span className="font-semibold">Hint: </span>
                      {q.hint.trim()}
                    </p>
                  ) : null}
                  {staticText ? (
                    <div className="mt-4 rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:text-emerald-300/90">
                        Explanation
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-950 dark:text-emerald-50/95">
                        {staticText}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  {staticText ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        setStaticExplainFor({
                          label: `Question ${idx + 1}`,
                          officialExplanation: staticText,
                        })
                      }
                    >
                      Open explanation full screen
                    </Button>
                  ) : q.hint?.trim() ? (
                    <p className="text-xs text-zinc-500">
                      See the hint above — no full write-up for this question.
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      No explanation available for this question.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>


      {staticExplainFor ? (
        <StaticExplanationModal
          open
          label={staticExplainFor.label}
          officialExplanation={staticExplainFor.officialExplanation}
          onClose={() => setStaticExplainFor(null)}
        />
      ) : null}
    </div>
  );
}
