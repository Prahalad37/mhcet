"use client";

import {
  useCallback,
  useEffect,
  useState,
  FormEvent,
  type ReactNode,
} from "react";
import { api, noErrorToast } from "@/lib/api";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { ExplainRequestBody, ExplainResponse } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

type Props = {
  open: boolean;
  onClose: () => void;
  payload: ExplainRequestBody & { label: string };
};

function friendlyErrorMessage(e: unknown): string {
  return getUserErrorMessage(e, {
    context: "explain",
    fallback: "Could not load explanation.",
  });
}

function SectionCard({
  label,
  children,
  delayClass,
}: {
  label: string;
  children: ReactNode;
  delayClass: string;
}) {
  return (
    <div
      className={`explain-stagger animate-fade-slide-in rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 ${delayClass}`}
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
        {label}
      </h3>
      <div className="mt-2.5 text-[0.9375rem] leading-relaxed text-zinc-800 dark:text-zinc-200">
        {children}
      </div>
    </div>
  );
}

export function ExplanationModal({ open, onClose, payload }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [followUpHint, setFollowUpHint] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: ExplainRequestBody = {
        attemptId: payload.attemptId,
        questionId: payload.questionId,
        question: payload.question,
        options: payload.options,
        correctAnswer: payload.correctAnswer,
      };
      const res = await api<ExplainResponse>("/api/explain", {
        method: "POST",
        body: JSON.stringify(body),
        ...noErrorToast,
      });
      setData(res);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [payload]);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setError(null);
    setFollowUp("");
    setFollowUpHint(false);
    void load();
  }, [open, load]);

  function close() {
    onClose();
    setData(null);
    setError(null);
    setFollowUp("");
    setFollowUpHint(false);
  }

  function onFollowUpSubmit(e: FormEvent) {
    e.preventDefault();
    if (!followUp.trim()) return;
    setFollowUpHint(true);
  }

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Explanation"
      subtitle="Overview for this question — structured like an AI overview."
      footer={
        error ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void load()}>
              Retry
            </Button>
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
          </div>
        ) : !loading && data ? (
          <form onSubmit={onFollowUpSubmit} className="space-y-2">
            <div className="flex gap-2 rounded-full border border-zinc-200 bg-zinc-50/80 py-1 pl-4 pr-1 shadow-inner dark:border-zinc-700 dark:bg-zinc-900/60">
              <input
                type="text"
                value={followUp}
                onChange={(e) => {
                  setFollowUp(e.target.value);
                  setFollowUpHint(false);
                }}
                placeholder="Ask a follow-up…"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                aria-label="Ask a follow-up"
              />
              <Button
                type="submit"
                className="!rounded-full !px-4 !py-2 !text-xs"
                disabled={!followUp.trim()}
              >
                Send
              </Button>
            </div>
            {followUpHint ? (
              <p className="animate-fade-slide-in pl-1 text-xs text-zinc-500 dark:text-zinc-400">
                Follow-up questions aren&apos;t supported in this version yet —
                nothing was sent to the server.
              </p>
            ) : null}
          </form>
        ) : null
      }
    >
      <div className="space-y-4">
        <p className="text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
          {payload.label}
        </p>

        {loading ? (
          <div
            className="explain-stagger animate-fade-slide-in flex min-h-[160px] flex-col items-center justify-center gap-4 py-8 text-zinc-600 dark:text-zinc-400"
            role="status"
            aria-live="polite"
          >
            <Spinner className="h-9 w-9 border-2 border-zinc-200 border-t-emerald-600" />
            <p className="text-sm">Generating overview…</p>
          </div>
        ) : null}

        {!loading && error ? (
          <Alert message={error} variant="error" />
        ) : null}

        {!loading && data ? (
          <div className="space-y-4">
            <div
              className="explain-stagger animate-fade-slide-in rounded-2xl border border-emerald-200/90 bg-emerald-50/95 p-4 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40"
              style={{ animationDelay: "0ms" }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-emerald-500">
                  Correct answer
                </span>
              </div>
              <p className="mt-3 text-[0.9375rem] font-medium leading-snug text-emerald-950 dark:text-emerald-100">
                {data.answer}
              </p>
            </div>

            <SectionCard label="Explanation" delayClass="[animation-delay:85ms]">
              <p className="whitespace-pre-wrap">{data.explanation}</p>
            </SectionCard>

            <SectionCard label="Concept" delayClass="[animation-delay:170ms]">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {data.concept}
              </p>
            </SectionCard>

            <SectionCard label="Example" delayClass="[animation-delay:255ms]">
              <p className="whitespace-pre-wrap">{data.example}</p>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
