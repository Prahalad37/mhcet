"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TooltipProps } from "recharts";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { pollJob } from "@/lib/jobPoll";
import { useClientMounted } from "@/lib/useClientMounted";
import type {
  AiExplainResult,
  AnalyticsInsights,
  AppConfig,
  AttemptResultResponse,
} from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageEmptyState } from "@/components/ui/PageEmptyState";
import { PageErrorState } from "@/components/ui/PageErrorState";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { AiExplanationModal } from "@/components/results/AiExplanationModal";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { CheckCircle2, CircleHelp, Clock3, Target, XCircle } from "lucide-react";

const COLORS = {
  correct: "#10b981",
  incorrect: "#f43f5e",
  unattempted: "#71717a",
};

type PieRow = { name: string; value: number; fill: string };

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

function PieTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as PieRow;
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/95">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{row.name}</p>
      <p className="mt-1 tabular-nums text-zinc-600 dark:text-zinc-300">{row.value} questions</p>
    </div>
  );
}

function ResultsAnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="animate-pulse overflow-hidden rounded-3xl border border-zinc-200/80 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="h-40 bg-gradient-to-br from-zinc-200/90 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900" />
        <div className="space-y-4 p-8">
          <div className="mx-auto h-10 w-2/3 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="mx-auto h-14 w-1/2 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="animate-pulse h-[280px] rounded-2xl border border-zinc-200/80 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/60" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse h-28 rounded-2xl border border-zinc-200/80 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/60"
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse h-36 rounded-2xl border border-zinc-200/80 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/60"
          />
        ))}
      </div>
    </div>
  );
}

export default function ExamAnalyticsResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useClientMounted();

  const [data, setData] = useState<AttemptResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [aiExplainFor, setAiExplainFor] = useState<{
    label: string;
    content: AiExplainResult;
  } | null>(null);
  const [aiExplainLoadingId, setAiExplainLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) {
      redirectToLogin(router, { next: pathname });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api<AttemptResultResponse>(
          `/api/attempts/${attemptId}/result`,
          noErrorToast
        );
        if (!cancelled) setData(res);
        try {
          const cfg = await api<AppConfig>("/api/config", noErrorToast);
          if (!cancelled) setConfig(cfg);
        } catch {
          /* optional */
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

  async function requestAiExplanation(questionId: string, idx: number) {
    if (!data || aiExplainLoadingId) return;
    setAiExplainLoadingId(questionId);
    setWarning(null);
    try {
      const { jobId } = await api<{ jobId: string }>("/api/explain", {
        method: "POST",
        body: JSON.stringify({
          attemptId: data.attemptId,
          questionId,
        }),
        ...noErrorToast,
      });
      const result = await pollJob<AiExplainResult>(jobId);
      setAiExplainFor({
        label: `Question ${idx + 1}`,
        content: result,
      });
    } catch (e) {
      setWarning(
        getUserErrorMessage(e, {
          fallback: "Could not load AI explanation. Is Redis running and the worker started?",
        })
      );
    } finally {
      setAiExplainLoadingId(null);
    }
  }

  const pieData = useMemo((): PieRow[] => {
    if (!data) return [];
    const rows: PieRow[] = [];
    if (data.correctAnswers > 0) {
      rows.push({
        name: "Correct",
        value: data.correctAnswers,
        fill: COLORS.correct,
      });
    }
    if (data.incorrectAnswers > 0) {
      rows.push({
        name: "Incorrect",
        value: data.incorrectAnswers,
        fill: COLORS.incorrect,
      });
    }
    if (data.unattempted > 0) {
      rows.push({
        name: "Unattempted",
        value: data.unattempted,
        fill: COLORS.unattempted,
      });
    }
    return rows;
  }, [data]);

  if (!mounted || !getToken()) {
    return <PageLoadingState label="Checking session" />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Loading your report…
        </p>
        <ResultsAnalyticsSkeleton />
      </div>
    );
  }

  if (error || !data) {
    if (error) {
      return (
        <PageErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
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

  const passed = data.passStatus;

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section
        className={`relative overflow-hidden rounded-3xl border shadow-xl backdrop-blur-sm transition-colors ${
          passed
            ? "border-emerald-300/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/90 dark:border-emerald-800/50 dark:from-emerald-950/40 dark:via-zinc-950 dark:to-emerald-950/20"
            : "border-rose-300/80 bg-gradient-to-br from-rose-50 via-white to-amber-50/90 dark:border-rose-900/50 dark:from-rose-950/35 dark:via-zinc-950 dark:to-amber-950/20"
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl ${
            passed ? "bg-emerald-400/20" : "bg-rose-400/15"
          }`}
        />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {data.testTitle}
          </p>
          <div className="mt-6 text-center">
            <h1
              className={`text-4xl font-black tracking-tight sm:text-5xl ${
                passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {passed ? "Passed!" : "Needs improvement"}
            </h1>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {passed
                ? "You met the benchmark — keep building consistency."
                : "Accuracy below 40% of all questions — review flagged items below."}
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-6 sm:gap-10">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Score
              </p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-5xl">
                {data.score}
                <span className="text-2xl font-semibold text-zinc-400 dark:text-zinc-500">
                  /{data.totalQuestions}
                </span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Accuracy
              </p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-5xl">
                {data.accuracy}
                <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">%</span>
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
            Submitted {formatSubmittedAt(data.submittedAt)}
          </p>
        </div>
      </section>

      {/* Chart + metric cards */}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
        <div className="glass-card flex min-h-[300px] flex-col p-6 sm:p-8">
          <h2 className="text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Outcome split
          </h2>
          <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Correct vs incorrect vs skipped
          </p>
          <div className="mt-4 h-[260px] w-full flex-1">
            {pieData.length === 0 ? (
              <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-zinc-500">
                No question data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={96}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={`c-${entry.name}-${i}`} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    formatter={(value) => (
                      <span className="text-zinc-700 dark:text-zinc-300">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="glass-card flex flex-col justify-center p-5">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Target className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Total</span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {data.totalQuestions}
            </p>
            <p className="mt-1 text-xs text-zinc-500">questions in mock</p>
          </div>
          <div className="glass-card flex flex-col justify-center p-5">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Attempted</span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {data.attempted}
            </p>
            <p className="mt-1 text-xs text-zinc-500">with an option chosen</p>
          </div>
          <div className="glass-card flex flex-col justify-center p-5">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Clock3 className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Time taken</span>
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatDuration(data.timeTakenSeconds)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">allowed {formatDuration(data.durationSeconds)}</p>
          </div>
          <div className="glass-card flex flex-col justify-center p-5">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Unattempted</span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {data.unattempted}
            </p>
            <p className="mt-1 text-xs text-zinc-500">left blank</p>
          </div>
        </div>
      </div>

      {warning ? <Alert message={warning} variant="info" /> : null}

      {insights && (insights.insightMessage || insights.topicStats.length > 0) ? (
        <div className="glass-card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Your analytics</h2>
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
                  className="rounded-lg border border-zinc-200/80 bg-white/60 px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900/40"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{s.topic}</span>{" "}
                  <span className="text-zinc-500">
                    {Math.round(s.accuracy * 100)}% ({s.correct}/{s.attempted})
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            href="/tests"
            className="inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View recommended tests →
          </Link>
        </div>
      ) : null}

      {/* Question breakdown */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Question review</h2>
          <Link href="/tests">
            <Button variant="secondary" className="w-full sm:w-auto">
              Take another test
            </Button>
          </Link>
        </div>

        <ul className="space-y-5">
          {data.responses.map((q, idx) => {
            const unattempted = !q.selectedOption;
            const borderClass = q.isCorrect
              ? "border-emerald-400/80 bg-emerald-500/[0.06] dark:border-emerald-700/60 dark:bg-emerald-950/25"
              : unattempted
                ? "border-zinc-300/90 bg-zinc-500/[0.06] dark:border-zinc-600 dark:bg-zinc-900/40"
                : "border-rose-400/80 bg-rose-500/[0.06] dark:border-rose-800/60 dark:bg-rose-950/20";

            const explain = q.explanation?.trim() ?? "";

            return (
              <li
                key={q.questionId}
                className={`rounded-2xl border-2 p-5 shadow-sm transition-colors ${borderClass}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Q{idx + 1}
                  </span>
                  {q.isCorrect ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Correct
                    </span>
                  ) : unattempted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
                      Skipped
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-900 dark:bg-rose-950/60 dark:text-rose-100">
                      <XCircle className="h-3.5 w-3.5" aria-hidden />
                      Incorrect
                    </span>
                  )}
                </div>

                <div className="mt-4 font-medium leading-relaxed text-zinc-900 dark:text-zinc-50">
                  <MarkdownRenderer content={q.prompt} />
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200/90 bg-white/70 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950/50">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Your answer
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {unattempted ? (
                        <span className="text-zinc-500">— Unattempted</span>
                      ) : (
                        <div className="space-y-1">
                          <span>{q.selectedOption}</span>
                          {q.selectedOptionText ? (
                            <div className="text-sm font-normal text-zinc-600 dark:text-zinc-300">
                              <MarkdownRenderer content={q.selectedOptionText} />
                            </div>
                          ) : null}
                        </div>
                      )}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                      Correct answer
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-emerald-950 dark:text-emerald-50">
                      <div className="space-y-1">
                        <span>{q.correctOption}</span>
                        {q.correctOptionText ? (
                          <div className="text-sm font-normal text-emerald-900/90 dark:text-emerald-100/90">
                            <MarkdownRenderer content={q.correctOptionText} />
                          </div>
                        ) : null}
                      </div>
                    </dd>
                  </div>
                </dl>

                {explain ? (
                  <details className="group mt-5 rounded-xl border border-indigo-200/70 bg-indigo-50/50 open:bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:open:bg-indigo-950/40">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-indigo-900 marker:content-none dark:text-indigo-200 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-2">
                        Explanation
                        <span className="text-xs font-normal text-indigo-600 group-open:rotate-180 dark:text-indigo-400">
                          ▼
                        </span>
                      </span>
                    </summary>
                    <div className="border-t border-indigo-200/60 px-4 pb-4 pt-2 text-sm leading-relaxed text-indigo-950 dark:border-indigo-900/40 dark:text-indigo-50/95">
                      <MarkdownRenderer content={explain} />
                    </div>
                  </details>
                ) : null}

                {config?.explainAvailable ? (
                  <div className="mt-4 border-t border-zinc-200/80 pt-4 dark:border-zinc-700">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full border-sky-300/80 bg-sky-50 text-sky-950 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-50 dark:hover:bg-sky-950/70 sm:w-auto"
                      disabled={aiExplainLoadingId === q.questionId}
                      onClick={() => void requestAiExplanation(q.questionId, idx)}
                    >
                      {aiExplainLoadingId === q.questionId
                        ? "Generating AI explanation…"
                        : "AI explanation"}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {aiExplainFor ? (
        <AiExplanationModal
          open
          label={aiExplainFor.label}
          content={aiExplainFor.content}
          onClose={() => setAiExplainFor(null)}
        />
      ) : null}
    </div>
  );
}
