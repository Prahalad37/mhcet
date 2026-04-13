"use client";

import { useEffect, useMemo, useState } from "react";
import type { TestDetail } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

function formatDuration(
  seconds: number,
  tr: (k: string, v?: Record<string, string | number>) => string
): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? tr("pre.durationHrMin", { h, m }) : tr("pre.durationHr", { h });
  }
  return tr("pre.durationMinutes", { mins });
}

function subjectBreakdown(
  questions: TestDetail["questions"],
  generalLabel: string
) {
  const map = new Map<string, number>();
  for (const q of questions) {
    const label = (q.subject && String(q.subject).trim()) || generalLabel;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

type Props = {
  test: TestDetail;
  onBack: () => void;
  onStart: (focusMode: boolean) => Promise<void>;
  starting: boolean;
};

export function PreExamGate({ test, onBack, onStart, starting }: Props) {
  const { locale, t: tr } = useLocale();
  const [modeOpen, setModeOpen] = useState(false);
  const [fsHint, setFsHint] = useState<string | null>(null);
  const rows = useMemo(
    () => subjectBreakdown(test.questions, tr("pre.generalSubject")),
    [test.questions, tr]
  );
  const total = test.questions.length;

  const customInstructionsMd = useMemo(() => {
    const en = test.generalInstructions?.trim() ?? "";
    const hi = test.generalInstructionsHi?.trim() ?? "";
    if (locale === "hi") {
      if (hi) return hi;
      if (en) return en;
      return null;
    }
    return en || null;
  }, [locale, test.generalInstructions, test.generalInstructionsHi]);

  useEffect(() => {
    if (!fsHint) return;
    const t = window.setTimeout(() => setFsHint(null), 5000);
    return () => window.clearTimeout(t);
  }, [fsHint]);

  async function requestFullscreenOptional() {
    try {
      await document.documentElement.requestFullscreen();
      setFsHint(null);
    } catch {
      setFsHint(tr("pre.fsBlocked"));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="sticky top-2 z-20 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            {tr("pre.brand")}
          </span>
          <span
            className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            title={test.title}
          >
            {test.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
            {tr("pre.timerOff")}
          </span>
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-100">
            {formatDuration(test.durationSeconds, tr)}
          </span>
          <LanguageSwitcher compact />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={starting}
            className="!py-1.5"
            onClick={() => void requestFullscreenOptional()}
          >
            {tr("pre.enterFullscreen")}
          </Button>
        </div>
      </header>

      {fsHint ? (
        <p className="text-center text-xs text-zinc-600 dark:text-zinc-400" role="status">
          {fsHint}
        </p>
      ) : null}

      <div className="rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/35 dark:text-sky-100">
        <p>
          <span className="font-semibold">{tr("pre.headsUp")} </span>
          {tr("pre.headsUpBody")}
        </p>
        <p className="mt-2 text-xs text-sky-900/85 dark:text-sky-200/90">
          {tr("pre.topicTag")} {test.topic}
        </p>
      </div>

      {test.description ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{test.description}</p>
      ) : null}

      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {tr("pre.generalInstructions")}
      </p>

      {customInstructionsMd ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
          <MarkdownRenderer
            content={customInstructionsMd}
            className="prose prose-sm max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200"
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {tr("pre.paletteTitle")}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {tr("pre.paletteIntro")}
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {tr("pre.paletteGrouping")}
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <span className="font-medium text-sky-700 dark:text-sky-300">
                {tr("pre.legendSky")}
              </span>{" "}
              — {tr("pre.legendAnswered")}
            </li>
            <li>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {tr("pre.legendOutlined")}
              </span>{" "}
              — {tr("pre.legendSeenDesc")}
            </li>
            <li>
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {tr("pre.legendAmber")}
              </span>{" "}
              — {tr("pre.legendMarked")}
            </li>
            <li>
              <span className="font-medium text-sky-600 dark:text-sky-400">
                {tr("pre.legendStrong")}
              </span>{" "}
              — {tr("pre.legendCurrentQ")}
            </li>
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {tr("pre.paperStructure")}
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">{tr("pre.colSection")}</th>
                <th className="px-4 py-3 text-right">{tr("pre.colQuestions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map(([subject, count]) => (
                <tr key={subject} className="text-zinc-800 dark:text-zinc-200">
                  <td className="px-4 py-2.5">{subject}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{count}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
                <td className="px-4 py-2.5">{tr("pre.totalRow")}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {!customInstructionsMd ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {tr("pre.answeringTitle")}
          </h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>{tr("pre.ans1")}</li>
            <li>{tr("pre.ans2")}</li>
            <li>{tr("pre.ans3")}</li>
            <li>{tr("pre.ans4")}</li>
            <li>{tr("pre.ans5")}</li>
          </ol>
        </section>
      ) : null}

      <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={starting}>
          {tr("pre.backTests")}
        </Button>
        <Button
          type="button"
          className="!bg-amber-400 !text-amber-950 hover:!bg-amber-500 dark:!bg-amber-400 dark:hover:!bg-amber-500"
          disabled={starting || total === 0}
          onClick={() => setModeOpen(true)}
        >
          {tr("pre.nextChooseMode")}
        </Button>
      </div>

      <Modal
        open={modeOpen}
        onClose={() => {
          if (!starting) setModeOpen(false);
        }}
        title={tr("pre.modalTitle")}
        subtitle={<span>{tr("pre.modalSubtitle")}</span>}
        wide
        bodyClassName="!py-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">{tr("pre.normalTitle")}</p>
            <ul className="mt-2 flex-1 list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {tr("pre.normalBullets")
                .split("|")
                .map((line) => (
                  <li key={line}>{line}</li>
                ))}
            </ul>
            <Button
              type="button"
              variant="secondary"
              className="mt-4 w-full"
              disabled={starting}
              onClick={async () => {
                try {
                  await onStart(false);
                  setModeOpen(false);
                } catch {
                  /* parent sets error; keep dialog open */
                }
              }}
            >
              {tr("pre.normalCta")}
            </Button>
          </div>
          <div className="flex flex-col rounded-xl border border-emerald-200/90 bg-emerald-50/50 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/30">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">{tr("pre.focusTitle")}</p>
            <ul className="mt-2 flex-1 list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {tr("pre.focusBullets")
                .split("|")
                .map((line) => (
                  <li key={line}>{line}</li>
                ))}
            </ul>
            <Button
              type="button"
              className="mt-4 w-full !bg-emerald-600 !text-white hover:!bg-emerald-700"
              disabled={starting}
              onClick={async () => {
                try {
                  await onStart(true);
                  setModeOpen(false);
                } catch {
                  /* parent sets error; keep dialog open */
                }
              }}
            >
              {tr("pre.focusCta")}
            </Button>
          </div>
        </div>
        {starting ? (
          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {tr("pre.starting")}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
