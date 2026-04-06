"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { useClientMounted } from "@/lib/useClientMounted";
import type {
  QuestionPublic,
  PracticeCheckResult,
  PracticeComplete,
} from "@/lib/types";
import { PageLoadingState } from "@/components/ui/PageLoadingState";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

type SessionData = {
  sessionId: string;
  subject: string;
  totalQuestions: number;
  questions: QuestionPublic[];
};

type Feedback = PracticeCheckResult & { selected: string };

export default function PracticeSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const mounted = useClientMounted();

  const [session, setSession] = useState<SessionData | null>(null);
  const [qi, setQi] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [checking, setChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedbackAnswered = useRef(new Set<string>());

  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) {
      redirectToLogin(router, { next: `/practice/${params.sessionId}` });
      return;
    }

    const stored = sessionStorage.getItem(`practice-${params.sessionId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionData;
        setSession(parsed);
        return;
      } catch { /* fall through */ }
    }

    router.replace("/practice");
  }, [mounted, params.sessionId, router]);

  const question = session?.questions[qi] ?? null;

  const optionValue = useCallback(
    (key: string) => {
      if (!question) return "";
      const map: Record<string, string> = {
        A: question.optionA,
        B: question.optionB,
        C: question.optionC,
        D: question.optionD,
      };
      return map[key] || "";
    },
    [question]
  );

  async function handleSelect(option: string) {
    if (feedback || checking || !session || !question) return;
    setChecking(true);
    setError(null);
    try {
      const result = await api<PracticeCheckResult>(
        `/api/practice/${session.sessionId}/check`,
        {
          method: "POST",
          body: JSON.stringify({
            questionId: question.id,
            selectedOption: option,
          }),
          ...noErrorToast,
        }
      );
      if (result.correct) setScore((s) => s + 1);
      feedbackAnswered.current.add(question.id);
      setFeedback({ ...result, selected: option });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        redirectToLogin(router, { next: `/practice/${params.sessionId}` });
        return;
      }
      setError(getUserErrorMessage(e, { fallback: "Could not check answer." }));
    } finally {
      setChecking(false);
    }
  }

  async function handleNext() {
    if (!session) return;
    const nextIdx = qi + 1;
    if (nextIdx >= session.totalQuestions) {
      try {
        await api<PracticeComplete>(`/api/practice/${session.sessionId}/complete`, {
          method: "POST",
          ...noErrorToast,
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          redirectToLogin(router, { next: `/practice/${params.sessionId}` });
          return;
        }
        // Ignore completion errors so user can still finish local flow.
      }
      sessionStorage.removeItem(`practice-${session.sessionId}`);
      setDone(true);
    } else {
      setQi(nextIdx);
      setFeedback(null);
    }
  }

  if (!mounted || !getToken()) {
    return <PageLoadingState label="Loading" />;
  }
  if (!session) {
    return <PageLoadingState label="Loading session" />;
  }

  if (done) {
    const total = session.totalQuestions;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Practice complete
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {session.subject}
          </p>

          <div className="mt-6 flex items-baseline justify-center gap-1">
            <span className="text-5xl font-extrabold tabular-nums text-sky-600">
              {score}
            </span>
            <span className="text-xl text-zinc-400">/ {total}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            {pct}% correct
          </p>

          <div
            className="mx-auto mt-5 h-2.5 w-48 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 80
                  ? "bg-emerald-500"
                  : pct >= 50
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/practice"
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
            >
              Practice more
            </Link>
            <Link
              href="/tests"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Back to tests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((qi + 1) / session.totalQuestions) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {session.subject}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Practice mode — no timer
          </p>
        </div>
        <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {qi + 1} / {session.totalQuestions}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      {question ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-base font-medium leading-relaxed text-zinc-900 dark:text-zinc-50">
            {question.prompt}
          </p>

          <ul className="mt-5 space-y-2.5">
            {OPTION_KEYS.map((key) => {
              let style =
                "border-zinc-200 bg-white text-zinc-800 hover:border-sky-300 hover:bg-sky-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:bg-sky-950/30";

              if (feedback) {
                if (key === feedback.correctOption) {
                  style =
                    "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100";
                } else if (
                  key === feedback.selected &&
                  !feedback.correct
                ) {
                  style =
                    "border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-100";
                } else {
                  style =
                    "border-zinc-100 bg-zinc-50/50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500";
                }
              }

              return (
                <li key={key}>
                  <button
                    disabled={!!feedback || checking}
                    onClick={() => handleSelect(key)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${style}`}
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-bold">
                      {key}
                    </span>
                    <span>{optionValue(key)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {checking ? (
            <p className="mt-4 text-center text-sm text-zinc-500">
              Checking…
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 text-center text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          ) : null}

          {/* Feedback panel */}
          {feedback ? (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                feedback.correct
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100"
              }`}
            >
              <p className="font-semibold">
                {feedback.correct ? "Correct!" : "Incorrect"}
              </p>
              {!feedback.correct ? (
                <p className="mt-1 text-xs opacity-80">
                  The correct answer is{" "}
                  <strong>{feedback.correctOption}</strong>.
                </p>
              ) : null}
              {feedback.hint ? (
                <p className="mt-2 text-xs opacity-80">
                  <span className="font-medium">Hint:</span> {feedback.hint}
                </p>
              ) : null}
              {feedback.officialExplanation ? (
                <p className="mt-2 text-xs opacity-80">
                  {feedback.officialExplanation}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Next / Finish */}
          {feedback ? (
            <button
              onClick={handleNext}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 sm:w-auto"
            >
              {qi + 1 >= session.totalQuestions
                ? "See results"
                : "Next question"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
