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
import type { AttemptResume, AttemptStart, TestDetail } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { Spinner } from "@/components/ui/Spinner";
import { TestTimer } from "@/components/test/TestTimer";
import { OptionButton } from "@/components/test/OptionButton";
import { PreExamGate } from "@/components/test/PreExamGate";
import { QuestionPalette } from "@/components/test/QuestionPalette";
import {
  countAnsweredInSection,
  deriveContiguousSections,
  getSectionForQuestionIndex,
  orderedSectionsForJumpTabs,
} from "@/lib/examSections";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { LOCALE_CHANGE_EVENT } from "@/lib/localeStorage";

type SelectionKey = "A" | "B" | "C" | "D";

/** sessionStorage key prefix; value "1" = focus, "0" = normal (resume parity). */
const EXAM_FOCUS_STORAGE_KEY = "mhcet-exam-focus";

function cloneSet<T>(s: Set<T>): Set<T> {
  return new Set(s);
}

function TakeTestInner() {
  const { t: tr } = useLocale();
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
  const [testPreview, setTestPreview] = useState<TestDetail | null>(null);
  const [startingExam, setStartingExam] = useState(false);
  const [examFocusMode, setExamFocusMode] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const submitLockRef = useRef(false);
  const submitSucceededRef = useRef(false);
  const testStartedAtMs = useRef(0);
  /** In-flight PATCH per question — flushed before final submit */
  const pendingAnswerSavesRef = useRef(new Map<string, Promise<void>>());

  const attemptId = attempt?.attemptId;
  const questionCount = attempt?.questions.length ?? 0;

  /** Active attempt only: drives global chrome + take layout (Normal vs Focus). */
  useEffect(() => {
    if (!attempt) {
      delete document.documentElement.dataset.examUi;
      return;
    }
    document.documentElement.dataset.examUi = examFocusMode ? "focus" : "normal";
    return () => {
      delete document.documentElement.dataset.examUi;
    };
  }, [attempt, examFocusMode]);

  useEffect(() => {
    if (!attempt) return;
    const onLocaleChange = () => {
      window.location.reload();
    };
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }, [attempt]);

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
            setError(tr("take.wrongAttempt"));
            return;
          }
          setAttempt({
            attemptId: data.attemptId,
            testId: data.testId,
            testTitle: data.testTitle,
            testTopic: data.testTopic,
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
          try {
            const raw = sessionStorage.getItem(
              `${EXAM_FOCUS_STORAGE_KEY}:${data.attemptId}`
            );
            if (raw === "1") setExamFocusMode(true);
            else if (raw === "0") setExamFocusMode(false);
          } catch {
            /* ignore */
          }
        } else {
          const detail = await api<TestDetail>(`/api/tests/${testId}`, noErrorToast);
          if (cancelled) return;
          setTestPreview(detail);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) {
            redirectToLogin(router, { next: nextPath });
            return;
          }
          setError(
            getUserErrorMessage(e, {
              fallback: resumeAttemptId
                ? tr("take.loadAttemptErr")
                : tr("take.loadTestErr"),
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
  }, [mounted, nextPath, resumeAttemptId, router, testId, tr]);

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
      try {
        sessionStorage.removeItem(
          `${EXAM_FOCUS_STORAGE_KEY}:${attempt.attemptId}`
        );
      } catch {
        /* ignore */
      }
      router.push(`/results/${attempt.attemptId}`);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        redirectToLogin(router, { next: nextPath });
        return;
      }
      setError(getUserErrorMessage(e, { fallback: tr("take.submitError") }));
    } finally {
      if (!submitSucceededRef.current) {
        submitLockRef.current = false;
      }
      setSubmitting(false);
      setAutoSubmitting(false);
    }
  }, [attempt, flushPendingAnswerSaves, nextPath, router, tr]);

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

  const examSections = useMemo(() => {
    if (!attempt?.questions?.length) return [];
    return deriveContiguousSections(attempt.questions);
  }, [attempt]);

  const jumpSections = useMemo(
    () => orderedSectionsForJumpTabs(examSections),
    [examSections]
  );

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
          setError(
            getUserErrorMessage(e, { fallback: tr("take.saveAnswerFallback") })
          );
        } finally {
          pendingAnswerSavesRef.current.delete(questionId);
          setSavingAnswer((cur) => (cur === questionId ? null : cur));
        }
      })();

      pendingAnswerSavesRef.current.set(questionId, promise);
    },
    [attempt, submitting, nextPath, router, tr]
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
    const idx = Math.min(currentIndex, lastIndex);
    if (idx < lastIndex) return;
    setShowSubmitModal(true);
  }

  if (!mounted || !getToken()) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-20"
        role="status"
        aria-live="polite"
      >
        <Spinner />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {tr("take.checkingSession")}
        </p>
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
          {resumeAttemptId
            ? tr("take.loadingAttempt")
            : tr("take.loadingTest")}
        </p>
      </div>
    );
  }

  if (testPreview && !attempt && !resumeAttemptId) {
    return (
      <div className="space-y-4">
        {error ? <Alert message={error} /> : null}
        <PreExamGate
          test={testPreview}
          onBack={() => router.push("/tests")}
          starting={startingExam}
          onStart={async (focusMode) => {
            setError(null);
            setStartingExam(true);
            try {
              if (focusMode) {
                await document.documentElement.requestFullscreen().catch(() => {});
              }
              setExamFocusMode(focusMode);
              const started = await api<AttemptStart>("/api/attempts", {
                method: "POST",
                body: JSON.stringify({ testId }),
                ...noErrorToast,
              });
              try {
                sessionStorage.setItem(
                  `${EXAM_FOCUS_STORAGE_KEY}:${started.attemptId}`,
                  focusMode ? "1" : "0"
                );
              } catch {
                /* ignore */
              }
              setAttempt(started);
              setTestPreview(null);
              setSelections({});
              setVisited(new Set<number>([0]));
              setCurrentIndex(0);
              setMarkedForReview(new Set());
              setTabLeaveWarning(false);
              testStartedAtMs.current = Date.now();
            } catch (e) {
              if (e instanceof ApiError && e.status === 401) {
                redirectToLogin(router, { next: nextPath });
                return;
              }
              setError(
                getUserErrorMessage(e, {
                  fallback: tr("take.startFallback"),
                })
              );
              throw e;
            } finally {
              setStartingExam(false);
            }
          }}
        />
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="space-y-4">
        <Alert message={error} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => router.push(`/tests/${testId}/take`)}>
            {tr("take.startFresh")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/tests")}>
            {tr("take.backTests")}
          </Button>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  if (questionCount === 0) {
    return (
      <Alert message={tr("take.noQuestions")} />
    );
  }

  const safeIndex = Math.min(currentIndex, lastIndex);
  const q = attempt.questions[safeIndex];
  const sectionCtx =
    examSections.length > 1
      ? getSectionForQuestionIndex(examSections, safeIndex)
      : null;
  /** Submitting blocks everything; saving only blocks options on this question */
  const navBusy = submitting;
  const optionsBusy = submitting || savingAnswer === q.id;

  if (!q) {
    return (
      <Alert message={tr("take.questionLoadError")} />
    );
  }
  const isMarked = markedForReview.has(safeIndex);
  const isFocusUi = examFocusMode;

  return (
    <form
      onSubmit={onSubmitForm}
      className={
        isFocusUi
          ? "flex min-h-[100dvh] w-[calc(100%+2rem)] max-w-[calc(100%+2rem)] -mx-4 flex-col gap-0 bg-zinc-950 pb-[env(safe-area-inset-bottom,0px)]"
          : "flex min-h-[calc(100dvh-5.5rem)] flex-col gap-0 pb-[env(safe-area-inset-bottom,0px)]"
      }
    >
      {/* Sticky exam header — Normal: below SiteNav; Focus: top of viewport (nav hidden) */}
      <header
        className={
          isFocusUi
            ? "sticky top-0 z-40 -mx-4 border-b border-zinc-800/90 bg-zinc-900/95 px-4 py-2.5 shadow-md backdrop-blur-md sm:py-3"
            : "sticky top-14 z-40 -mx-4 border-b border-zinc-200/80 bg-white/85 px-4 py-2 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85 sm:top-16 sm:py-3"
        }
      >
        <div className="flex flex-row items-center justify-between gap-2 sm:items-start sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={
                  isFocusUi
                    ? "truncate text-sm font-semibold tracking-tight text-zinc-100 sm:text-base"
                    : "truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg"
                }
              >
                {attempt.testTitle ?? tr("take.mockTitle")}
              </h1>
              {isFocusUi ? (
                <span className="shrink-0 rounded-full border border-emerald-700/60 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  {tr("take.focusBadge")}
                </span>
              ) : null}
            </div>
            {resumeAttemptId ? (
              <p
                className={
                  isFocusUi
                    ? "mt-0.5 line-clamp-1 text-xs leading-snug text-zinc-400 sm:mt-1 sm:line-clamp-none sm:text-sm"
                    : "mt-0.5 line-clamp-1 text-xs leading-snug text-zinc-600 dark:text-zinc-400 sm:mt-1 sm:line-clamp-none sm:text-sm"
                }
              >
                {tr("take.resumeHint")}
              </p>
            ) : attempt.testTopic ? (
              <p
                className={
                  isFocusUi
                    ? "mt-0.5 text-xs leading-snug text-zinc-400 sm:mt-1 sm:text-sm"
                    : "mt-0.5 text-xs leading-snug text-zinc-600 dark:text-zinc-400 sm:mt-1 sm:text-sm"
                }
              >
                <span className="line-clamp-1 sm:line-clamp-none">
                  {attempt.testTopic}
                </span>
                <span className="hidden sm:inline">
                  {" "}
                  {tr("take.navHints")}
                </span>
              </p>
            ) : (
              <p
                className={
                  isFocusUi
                    ? "mt-0.5 hidden text-sm leading-snug text-zinc-400 sm:mt-1 sm:block"
                    : "mt-0.5 hidden text-sm leading-snug text-zinc-600 dark:text-zinc-400 sm:mt-1 sm:block"
                }
              >
                {tr("take.navHintsShort")}
              </p>
            )}
          </div>
          <div
            className={
              isFocusUi
                ? "flex shrink-0 items-center gap-2 self-center scale-110 sm:self-start sm:pt-0.5"
                : "flex shrink-0 items-center gap-2 self-center sm:self-start sm:pt-0.5"
            }
          >
            <LanguageSwitcher compact dark={isFocusUi} />
            <TestTimer
              endsAtMs={endsAtMs}
              onExpire={onExpire}
              variant={isFocusUi ? "onDark" : "default"}
            />
          </div>
        </div>
      </header>

      <div
        className={
          isFocusUi
            ? "flex flex-1 flex-col gap-4 px-4 pt-4"
            : "flex flex-1 flex-col gap-4 pt-4"
        }
      >
        {tabLeaveWarning ? (
          <div
            className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            {examFocusMode
              ? tr("take.tabLeaveFocus")
              : tr("take.tabLeaveNormal")}
          </div>
        ) : null}

        {isOffline ? (
          <div
            className="flex items-center justify-between rounded-xl border border-rose-200/90 bg-rose-50/95 px-4 py-3 text-sm text-rose-950 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-100"
            role="status"
          >
            <span>{tr("take.offline")}</span>
            <Spinner />
          </div>
        ) : null}

        {error ? <Alert message={error} /> : null}

        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          {jumpSections.length > 1 ? (
            <div
              className="order-1 w-full min-w-0 lg:col-start-2 lg:row-start-1"
              key="section-tabs"
            >
              <div
                className={
                  isFocusUi
                    ? "sticky top-16 z-30 -mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-zinc-700/60 bg-zinc-900/90 px-2 py-1.5 shadow-sm backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] sm:top-[4.5rem] lg:static lg:z-0 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none [&::-webkit-scrollbar]:hidden"
                    : "sticky top-[6.75rem] z-30 -mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-zinc-200/70 bg-zinc-50/95 px-2 py-1.5 shadow-sm backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] dark:border-zinc-800/70 dark:bg-zinc-950/95 sm:top-[8rem] lg:static lg:z-0 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none [&::-webkit-scrollbar]:hidden"
                }
                role="tablist"
                aria-label={tr("take.sectionJump")}
              >
                {jumpSections.map((sec) => {
                  const tot = sec.endIndex - sec.startIndex + 1;
                  const ans = countAnsweredInSection(sec, answeredIndices);
                  const active =
                    safeIndex >= sec.startIndex && safeIndex <= sec.endIndex;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      disabled={navBusy}
                      onClick={() => goTo(sec.startIndex)}
                      className={`flex min-w-0 max-w-[10rem] shrink-0 flex-col items-start rounded-lg border px-2 py-1.5 text-left text-[11px] transition-colors lg:max-w-[11rem] lg:rounded-xl lg:px-3 lg:py-2 lg:text-xs ${
                        active
                          ? "border-sky-500 bg-sky-50 text-sky-950 dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-100"
                          : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      } ${navBusy ? "opacity-60" : ""}`}
                    >
                      <span className="line-clamp-2 font-semibold leading-tight">
                        {sec.label}
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                        {tr("take.answeredCount", { ans, tot })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <aside
            className={
              isFocusUi
                ? "order-2 w-full lg:sticky lg:top-6 lg:self-start lg:col-start-1 lg:row-start-1 lg:row-span-2"
                : "order-2 w-full lg:sticky lg:top-[5.75rem] lg:self-start lg:col-start-1 lg:row-start-1 lg:row-span-2"
            }
          >
            <QuestionPalette
              total={questionCount}
              currentIndex={safeIndex}
              visited={visited}
              answered={answeredIndices}
              markedForReview={markedForReview}
              disabled={navBusy}
              onSelect={goTo}
              sections={examSections.length > 1 ? examSections : null}
            />
          </aside>

          <div
            className={`order-3 min-w-0 space-y-3 lg:col-start-2 ${
              jumpSections.length > 1 ? "lg:row-start-2" : "lg:row-start-1"
            }`}
            key={q.id}
          >
            <div
              className={
                isFocusUi
                  ? "rounded-xl border border-zinc-600/50 bg-zinc-900/40 p-5 shadow-lg ring-1 ring-zinc-700/30 backdrop-blur-sm transition-all duration-200 ease-in-out"
                  : "rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 ease-in-out dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-md"
              }
            >
              {sectionCtx ? (
                <p
                  className={
                    isFocusUi
                      ? "mb-2 text-xs font-semibold text-emerald-300/95"
                      : "mb-2 text-xs font-semibold text-sky-800 dark:text-sky-200"
                  }
                >
                  {tr("take.sectionLine", {
                    label: sectionCtx.section.label,
                    answered: countAnsweredInSection(
                      sectionCtx.section,
                      answeredIndices
                    ),
                    total: sectionCtx.sectionSize,
                    qInSection: sectionCtx.withinSection,
                  })}
                </p>
              ) : null}
              <p
                className={
                  isFocusUi
                    ? "mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400"
                    : "mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                }
              >
                {tr("take.questionNofM", {
                  n: safeIndex + 1,
                  m: questionCount,
                })}
              </p>
              <div
                className={
                  isFocusUi
                    ? "border-b border-zinc-700/60 pb-5"
                    : "border-b border-zinc-100 pb-5 dark:border-zinc-800/80"
                }
              >
                <MarkdownRenderer
                  content={q.prompt}
                  className={
                    isFocusUi
                      ? "prose prose-lg max-w-none leading-relaxed prose-invert text-zinc-100"
                      : "prose prose-lg max-w-none leading-relaxed text-zinc-800 dark:prose-invert dark:text-zinc-200"
                  }
                />
              </div>
              <div className="mt-5 space-y-3">
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
                <p
                  className={
                    isFocusUi
                      ? "mt-3 text-xs text-zinc-400"
                      : "mt-3 text-xs text-zinc-500 dark:text-zinc-400"
                  }
                >
                  {tr("take.syncing")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div
        className={
          isFocusUi
            ? "sticky bottom-0 z-40 -mx-4 mt-auto border-t border-zinc-700/80 bg-zinc-900/95 px-4 py-2.5 shadow-[0_-8px_32px_-6px_rgba(0,0,0,0.55)] backdrop-blur-md"
            : "sticky bottom-0 z-40 -mx-4 mt-auto border-t border-zinc-200/80 bg-white/90 px-4 py-3 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90 dark:shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.4)]"
        }
      >
        <div
          className={
            isFocusUi
              ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              : "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={navBusy || safeIndex <= 0}
              onClick={goPrev}
            >
              {tr("take.previous")}
            </Button>
            <Button
              type="button"
              variant={isMarked ? "primary" : "secondary"}
              disabled={navBusy}
              onClick={toggleMarkForReview}
              aria-pressed={isMarked}
              title={tr("take.keyboardMTitle")}
            >
              {isMarked ? tr("take.markedReview") : tr("take.markReview")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={navBusy || safeIndex >= lastIndex}
              onClick={goNext}
            >
              {safeIndex >= lastIndex ? tr("take.lastQuestion") : tr("take.next")}
            </Button>
          </div>
          {safeIndex >= lastIndex ? (
            <Button
              type="button"
              disabled={navBusy}
              title={tr("take.submitPendingTitle")}
              onClick={() => setShowSubmitModal(true)}
            >
              {autoSubmitting
                ? tr("take.timeUpSubmitting")
                : submitting
                  ? tr("take.submitting")
                  : tr("take.submitTest")}
            </Button>
          ) : null}
        </div>
      </div>

      <Modal
        open={showSubmitModal}
        title={tr("take.submitModalTitle")}
        onClose={() => setShowSubmitModal(false)}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowSubmitModal(false)}>
              {tr("take.cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={submitting}
              onClick={() => submit()}
            >
              {submitting ? tr("take.submitting") : tr("take.confirmSubmit")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-zinc-600 dark:text-zinc-400">
            {tr("take.submitModalBody")}
          </p>
          <div className="rounded-lg bg-zinc-50 border border-zinc-200/80 p-4 dark:bg-zinc-900/50 dark:border-zinc-800/80">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {tr("take.submitModalSummary", {
                answered: answeredIndices.size,
                total: questionCount,
              })}
            </p>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            {tr("take.submitModalWarn")}
          </p>
        </div>
      </Modal>
    </form>
  );
}

function TakeSuspenseFallback() {
  const { t: tr } = useLocale();
  return <PageLoadingState label={tr("take.loadingSuspense")} compact />;
}

export default function TakeTestPage() {
  return (
    <Suspense fallback={<TakeSuspenseFallback />}>
      <TakeTestInner />
    </Suspense>
  );
}
