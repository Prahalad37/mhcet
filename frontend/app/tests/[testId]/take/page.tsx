"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  FormEvent,
} from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { useClientMounted } from "@/lib/useClientMounted";
import type { AttemptResume, AttemptStart } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { Spinner } from "@/components/ui/Spinner";
import { TestTimer } from "@/components/test/TestTimer";
import { OptionButton } from "@/components/test/OptionButton";
import { QuestionPalette } from "@/components/test/QuestionPalette";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

type SelectionKey = "A" | "B" | "C" | "D";

function cloneSet<T>(s: Set<T>): Set<T> {
  return new Set(s);
}

function TakeTestInner() {
  const params = useParams<{ testId: string }>();
  const testId = params.testId;
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useClientMounted();
  const searchParams = useSearchParams();
  const resumeAttemptId = searchParams.get("attemptId");
  const nextPath = resumeAttemptId
    ? `${pathname}?attemptId=${encodeURIComponent(resumeAttemptId)}`
    : pathname;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptStart | null>(null);
  const [selections, setSelections] = useState<Record<string, SelectionKey>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState<string | null>(null);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visited, setVisited] = useState(() => new Set<number>([0]));
  const [markedForReview, setMarkedForReview] = useState(
    () => new Set<number>()
  );
  const [tabLeaveWarning, setTabLeaveWarning] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const submitLockRef = useRef(false);
  const submitSucceededRef = useRef(false);
  const testStartedAtMs = useRef(0);
  /** In-flight PATCH per question — flushed before final submit */
  const pendingAnswerSavesRef = useRef(new Map<string, Promise<void>>());

  const attemptId = attempt?.attemptId;
  const questionCount = attempt?.questions.length ?? 0;

  useEffect(() => {
    if (!attemptId) return;
    setCurrentIndex(0);
    setMarkedForReview(new Set());
    setTabLeaveWarning(false);
    setAutoSubmitting(false);
    submitSucceededRef.current = false;
    submitLockRef.current = false;
  }, [attemptId]);

  useEffect(() => {
    if (!questionCount) return;
    const max = questionCount - 1;
    setCurrentIndex((i) => Math.min(i, max));
  }, [attemptId, questionCount]);

  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) {
      redirectToLogin(router, { next: nextPath });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (resumeAttemptId) {
          const data = await api<AttemptResume>(
            `/api/attempts/${resumeAttemptId}/resume`,
            noErrorToast
          );
          if (cancelled) return;
          if (data.testId !== testId) {
            setError("This saved attempt belongs to another test.");
            return;
          }
          setAttempt({
            attemptId: data.attemptId,
            startedAt: data.startedAt,
            endsAt: data.endsAt,
            durationSeconds: data.durationSeconds,
            totalQuestions: data.totalQuestions,
            questions: data.questions,
          });
          setSelections(data.selections);
          const initialVisited = new Set<number>([0]);
          data.questions.forEach((question, index) => {
            if (data.selections[question.id]) initialVisited.add(index);
          });
          setVisited(initialVisited);
          testStartedAtMs.current = Date.now();
        } else {
          const started = await api<AttemptStart>("/api/attempts", {
            method: "POST",
            body: JSON.stringify({ testId }),
            ...noErrorToast,
          });
          if (!cancelled) {
            setSelections({});
            setAttempt(started);
            setVisited(new Set<number>([0]));
            testStartedAtMs.current = Date.now();
          }
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) {
            redirectToLogin(router, { next: nextPath });
            return;
          }
          setError(
            getUserErrorMessage(e, { fallback: "Could not load this attempt." })
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, nextPath, resumeAttemptId, router, testId]);

  useEffect(() => {
    setVisited((v) => cloneSet(v).add(currentIndex));
  }, [currentIndex]);

  useEffect(() => {
    if (!attempt || submitting) return;

    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      if (Date.now() - testStartedAtMs.current < 1000) return;
      setTabLeaveWarning(true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [attempt, submitting]);

  const endsAtMs = useMemo(() => {
    if (!attempt) return 0;
    if (attempt.endsAt) {
      return new Date(attempt.endsAt).getTime();
    }
    const started = new Date(attempt.startedAt).getTime();
    return started + attempt.durationSeconds * 1000;
  }, [attempt]);

  const flushPendingAnswerSaves = useCallback(async () => {
    while (pendingAnswerSavesRef.current.size > 0) {
      const batch = Array.from(pendingAnswerSavesRef.current.values());
      await Promise.allSettled(batch);
    }
  }, []);

  const flushOfflineAnswers = useCallback(async () => {
    if (!attempt || submitting) return;
    const key = `offline-answers-${attempt.attemptId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return;
    try {
      const records = JSON.parse(stored) as Record<string, string>;
      const keys = Object.keys(records);
      if (keys.length === 0) return;
      
      for (const qId of keys) {
        await api(`/api/attempts/${attempt.attemptId}/answers`, {
          method: "PATCH",
          body: JSON.stringify({ questionId: qId, selectedOption: records[qId] }),
        });
        const fresh = JSON.parse(localStorage.getItem(key) || "{}");
        delete fresh[qId];
        localStorage.setItem(key, JSON.stringify(fresh));
      }
    } catch {
      // Ignored, will retry next interval
    }
  }, [attempt, submitting]);

  useEffect(() => {
    if (!attempt || submitting) return;
    const intervalId = setInterval(flushOfflineAnswers, 5000);
    return () => clearInterval(intervalId);
  }, [attempt, submitting, flushOfflineAnswers]);

  useEffect(() => {
    if (!window) return;
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      flushOfflineAnswers();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [flushOfflineAnswers]);

  const submit = useCallback(async () => {
    if (!attempt || submitLockRef.current || submitSucceededRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await flushPendingAnswerSaves();
      await api(`/api/attempts/${attempt.attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({}),
        ...noErrorToast,
      });
      submitSucceededRef.current = true;
      router.push(`/attempts/${attempt.attemptId}/results`);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        redirectToLogin(router, { next: nextPath });
        return;
      }
      setError(getUserErrorMessage(e, { fallback: "Submit failed." }));
    } finally {
      if (!submitSucceededRef.current) {
        submitLockRef.current = false;
      }
      setSubmitting(false);
      setAutoSubmitting(false);
    }
  }, [attempt, flushPendingAnswerSaves, nextPath, router]);

  const onExpire = useCallback(() => {
    setAutoSubmitting(true);
    void submit();
  }, [submit]);

  const answeredIndices = useMemo(() => {
    if (!attempt) return new Set<number>();
    const s = new Set<number>();
    attempt.questions.forEach((q, i) => {
      if (selections[q.id]) s.add(i);
    });
    return s;
  }, [attempt, selections]);

  const lastIndex = Math.max(0, questionCount - 1);

  const goTo = useCallback(
    (index: number) => {
      if (!attempt || submitting) return;
      setCurrentIndex(Math.max(0, Math.min(lastIndex, index)));
    },
    [attempt, submitting, lastIndex]
  );

  const goPrev = useCallback(() => {
    const idx = Math.min(currentIndex, lastIndex);
    goTo(idx - 1);
  }, [currentIndex, lastIndex, goTo]);

  const goNext = useCallback(() => {
    const idx = Math.min(currentIndex, lastIndex);
    goTo(idx + 1);
  }, [currentIndex, lastIndex, goTo]);

  const toggleMarkForReview = useCallback(() => {
    if (submitting) return;
    const idx = Math.min(currentIndex, lastIndex);
    setMarkedForReview((prev) => {
      const next = cloneSet(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, [currentIndex, lastIndex, submitting]);

  const patchAnswer = useCallback(
    (questionId: string, value: SelectionKey) => {
      if (!attempt || submitting) return;
      setSelections((s) => ({ ...s, [questionId]: value }));
      setSavingAnswer(questionId);

      const attemptIdForSave = attempt.attemptId;
      const promise = (async () => {
        try {
          await api(`/api/attempts/${attemptIdForSave}/answers`, {
            method: "PATCH",
            body: JSON.stringify({ questionId, selectedOption: value }),
            ...noErrorToast,
          });
        } catch (e) {
          if (e instanceof ApiError && e.status === 0) {
            setIsOffline(true);
            const key = `offline-answers-${attemptIdForSave}`;
            const offlineData = JSON.parse(localStorage.getItem(key) || "{}");
            offlineData[questionId] = value;
            localStorage.setItem(key, JSON.stringify(offlineData));
            setError(null);
            return;
          }
          if (e instanceof ApiError && e.status === 401) {
            redirectToLogin(router, { next: nextPath });
            return;
          }
          setError(getUserErrorMessage(e, { fallback: "Could not save answer." }));
        } finally {
          pendingAnswerSavesRef.current.delete(questionId);
          setSavingAnswer((cur) => (cur === questionId ? null : cur));
        }
      })();

      pendingAnswerSavesRef.current.set(questionId, promise);
    },
    [attempt, submitting, nextPath, router]
  );

  useEffect(() => {
    if (!attempt || submitting) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.closest("input") ||
          t.closest("textarea") ||
          t.closest("[contenteditable=true]"))
      ) {
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMarkForReview();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attempt, submitting, goPrev, goNext, toggleMarkForReview]);

  async function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    await submit();
  }

  if (!mounted || !getToken()) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-20"
        role="status"
        aria-live="polite"
      >
        <Spinner />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Checking session…</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-20"
        role="status"
        aria-live="polite"
      >
        <Spinner />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {resumeAttemptId ? "Loading your attempt…" : "Starting your test…"}
        </p>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="space-y-4">
        <Alert message={error} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => router.push(`/tests/${testId}/take`)}>
            Start fresh attempt
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/tests")}>
            Back to tests
          </Button>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  if (questionCount === 0) {
    return (
      <Alert message="This test has no questions yet. Please contact support." />
    );
  }

  const safeIndex = Math.min(currentIndex, lastIndex);
  const q = attempt.questions[safeIndex];
  /** Submitting blocks everything; saving only blocks options on this question */
  const navBusy = submitting;
  const optionsBusy = submitting || savingAnswer === q.id;

  if (!q) {
    return (
      <Alert message="Could not load this question. Try refreshing the page." />
    );
  }
  const isMarked = markedForReview.has(safeIndex);

  return (
    <form onSubmit={onSubmitForm} className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Mock test
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {resumeAttemptId
              ? "Resuming your saved attempt. Timer uses the original start time."
              : "Palette matches exam style: answered, marked for review, and current question. Use ← → keys to move; M marks for review."}
          </p>
        </div>
        <TestTimer endsAtMs={endsAtMs} onExpire={onExpire} />
      </div>

      {tabLeaveWarning ? (
        <div
          className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          You left the test tab. Stay focused—repeated switching may be treated
          as suspicious in proctored exams.
        </div>
      ) : null}

      {isOffline ? (
        <div
          className="rounded-xl border border-rose-200/90 bg-rose-50/95 px-4 py-3 text-sm text-rose-950 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-100 flex items-center justify-between"
          role="status"
        >
          <span>You are offline. Your answers are being saved locally and will sync when reconnected.</span>
          <Spinner />
        </div>
      ) : null}

      {error ? <Alert message={error} /> : null}

      <QuestionPalette
        total={questionCount}
        currentIndex={safeIndex}
        visited={visited}
        answered={answeredIndices}
        markedForReview={markedForReview}
        disabled={navBusy}
        onSelect={goTo}
      />

      <div
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        key={q.id}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
          Question {safeIndex + 1} of {questionCount}
        </p>
        <MarkdownRenderer content={q.prompt} />
        <div className="mt-4 space-y-2">
          <OptionButton
            label="A"
            text={q.optionA}
            selected={selections[q.id] === "A"}
            disabled={optionsBusy}
            onSelect={() => patchAnswer(q.id, "A")}
          />
          <OptionButton
            label="B"
            text={q.optionB}
            selected={selections[q.id] === "B"}
            disabled={optionsBusy}
            onSelect={() => patchAnswer(q.id, "B")}
          />
          <OptionButton
            label="C"
            text={q.optionC}
            selected={selections[q.id] === "C"}
            disabled={optionsBusy}
            onSelect={() => patchAnswer(q.id, "C")}
          />
          <OptionButton
            label="D"
            text={q.optionD}
            selected={selections[q.id] === "D"}
            disabled={optionsBusy}
            onSelect={() => patchAnswer(q.id, "D")}
          />
        </div>
        {savingAnswer === q.id ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Syncing answer…
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={navBusy || safeIndex <= 0}
            onClick={goPrev}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant={isMarked ? "primary" : "secondary"}
            disabled={navBusy}
            onClick={toggleMarkForReview}
            aria-pressed={isMarked}
            title="Keyboard: M"
          >
            {isMarked ? "Marked for review" : "Mark for review"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={navBusy || safeIndex >= lastIndex}
            onClick={goNext}
          >
            {safeIndex >= lastIndex ? "Last question" : "Next"}
          </Button>
        </div>
        <Button type="submit" disabled={navBusy} title="Finishes after any pending saves">
          {autoSubmitting
            ? "Time up — submitting…"
            : submitting
              ? "Submitting…"
              : "Submit test"}
        </Button>
      </div>
    </form>
  );
}

export default function TakeTestPage() {
  return (
    <Suspense fallback={<PageLoadingState label="Loading test" compact />}>
      <TakeTestInner />
    </Suspense>
  );
}
