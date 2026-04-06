"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { useClientMounted } from "@/lib/useClientMounted";
import type { PracticeSubject, PracticeSession } from "@/lib/types";
import { PageErrorState } from "@/components/ui/PageErrorState";
import { PageLoadingState } from "@/components/ui/PageLoadingState";

const SUBJECT_ICONS: Record<string, string> = {
  "Legal Aptitude": "\u2696\uFE0F",
  "GK & Current Affairs": "\uD83C\uDF0D",
  "Logical Reasoning": "\uD83E\uDDE9",
  "Basic Math": "\uD83D\uDCCA",
  English: "\uD83D\uDCD6",
};

const COUNT_OPTIONS = [5, 10, 15, 20];

export default function PracticePage() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useClientMounted();

  const [subjects, setSubjects] = useState<PracticeSubject[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
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
        const data = await api<PracticeSubject[]>("/api/practice/subjects", noErrorToast);
        if (!cancelled) setSubjects(data);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) {
            redirectToLogin(router, { next: pathname });
            return;
          }
          setError(getUserErrorMessage(e, { fallback: "Could not load subjects." }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mounted, pathname, router, reloadTick]);

  async function startSession(subject: string) {
    const count = counts[subject] || 10;
    setStarting(subject);
    try {
      const session = await api<PracticeSession>("/api/practice/start", {
        method: "POST",
        body: JSON.stringify({ subject, count }),
        ...noErrorToast,
      });
      sessionStorage.setItem(
        `practice-${session.sessionId}`,
        JSON.stringify(session)
      );
      router.push(`/practice/${session.sessionId}`);
    } catch (e) {
      setStarting(null);
      setError(getUserErrorMessage(e, { fallback: "Could not start practice session." }));
    }
  }

  if (!mounted || !getToken()) {
    return <PageLoadingState label="Checking session" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Practice Mode
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pick a subject and drill questions at your own pace. No timer — get
          instant feedback after each answer.
        </p>
      </div>

      {loading ? <PageLoadingState label="Loading subjects" /> : null}
      {!loading && error ? (
        <PageErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setReloadTick((v) => v + 1);
          }}
          backHref="/tests"
          backLabel="Back to tests"
        />
      ) : null}

      {!loading && !error && subjects && subjects.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const icon = SUBJECT_ICONS[s.subject] || "\uD83D\uDCDD";
            const selected = counts[s.subject] || 10;
            const isStarting = starting === s.subject;
            const maxQ = Math.min(s.questionCount, 20);

            return (
              <li
                key={s.subject}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span className="text-3xl">{icon}</span>
                <h2 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {s.subject}
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {s.questionCount} questions available
                </p>

                <div className="mt-4">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Questions
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {COUNT_OPTIONS.filter((c) => c <= maxQ).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCounts((prev) => ({ ...prev, [s.subject]: c }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                          selected === c
                            ? "bg-sky-600 text-white"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isStarting || !!starting}
                  onClick={() => startSession(s.subject)}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm outline-none transition-colors hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-50"
                >
                  {isStarting ? "Starting\u2026" : "Start practice"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
