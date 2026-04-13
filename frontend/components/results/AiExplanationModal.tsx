"use client";

import type { AiExplainResult } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CheckCircle2,
  Quote,
  Sparkles,
  Zap,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  /** Set when the job completes; may be missing if the worker stored an empty return value. */
  content: AiExplainResult | null;
};

type SectionVariant = "answer" | "explain" | "concept" | "example";

const sectionShell: Record<
  SectionVariant,
  string
> = {
  answer:
    "border-l-[5px] border-l-emerald-500 bg-gradient-to-br from-emerald-50/95 via-white to-white shadow-sm ring-1 ring-emerald-500/10 dark:from-emerald-950/35 dark:via-zinc-950/90 dark:to-zinc-950 dark:ring-emerald-500/20",
  explain:
    "border-l-[5px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/40 shadow-sm ring-1 ring-indigo-500/10 dark:from-indigo-950/30 dark:via-zinc-950/90 dark:to-zinc-950 dark:ring-indigo-500/15",
  concept:
    "border border-violet-200/90 bg-gradient-to-br from-violet-50/95 to-fuchsia-50/40 shadow-sm ring-1 ring-violet-300/30 dark:border-violet-800/60 dark:from-violet-950/35 dark:to-zinc-950/90 dark:ring-violet-500/20",
  example:
    "border-l-[5px] border-l-amber-400 bg-gradient-to-br from-amber-50/90 to-orange-50/30 shadow-sm ring-1 ring-amber-400/20 dark:from-amber-950/25 dark:to-zinc-950/80 dark:ring-amber-500/15",
};

const titleRow: Record<SectionVariant, string> = {
  answer: "text-emerald-700 dark:text-emerald-300",
  explain: "text-indigo-700 dark:text-indigo-300",
  concept: "text-violet-700 dark:text-violet-300",
  example: "text-amber-800 dark:text-amber-200",
};

function SectionCard({
  variant,
  title,
  text,
  icon: Icon,
}: {
  variant: SectionVariant;
  title: string;
  text: string;
  icon: LucideIcon;
}) {
  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 ${sectionShell[variant]}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900/80 dark:ring-white/10 ${titleRow[variant]}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </span>
        <h3
          className={`text-[11px] font-bold uppercase tracking-[0.14em] ${titleRow[variant]}`}
        >
          {title}
        </h3>
      </div>
      <div className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-zinc-800 dark:text-zinc-100">
        {text}
      </div>
    </div>
  );
}

export function AiExplanationModal({ open, onClose, label, content }: Props) {
  const isCached = content?.cached === true;
  const metaShort = isCached
    ? "Instant — no API quota used"
    : "Uses your daily AI explain quota when the model runs live";

  const subtitleNode = content ? (
    <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
          isCached
            ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400/40 dark:bg-emerald-950/80 dark:text-emerald-100 dark:ring-emerald-500/30"
            : "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-950 ring-1 ring-amber-400/50 dark:from-amber-950/90 dark:to-orange-950/60 dark:text-amber-100 dark:ring-amber-500/30"
        }`}
      >
        {isCached ? (
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        {isCached ? "From cache" : "Live AI"}
      </span>
      <span className="text-sm leading-snug text-indigo-100/95">
        {metaShort}
      </span>
    </span>
  ) : (
    "Something went wrong"
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="AI explanation"
      subtitle={subtitleNode}
      surfaceClassName="!shadow-2xl !shadow-indigo-500/[0.12] ring-1 ring-indigo-500/10 dark:ring-indigo-400/15"
      headerClassName="!border-b-0 !bg-gradient-to-br !from-indigo-600 !via-violet-600 !to-fuchsia-600 !px-5 !py-5 sm:!px-6"
      titleClassName="!text-lg !font-semibold !text-white drop-shadow-sm"
      subtitleClassName="!mt-1 !text-indigo-100/95"
      closeButtonClassName="!text-white hover:!bg-white/15 dark:hover:!bg-white/10"
      footer={
        <Button
          variant="primary"
          className="min-w-[7rem] shadow-md shadow-indigo-500/25"
          onClick={onClose}
        >
          Close
        </Button>
      }
    >
      {!content ? (
        <p className="text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          No explanation payload was returned. Ensure{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
            npm run worker
          </code>{" "}
          is running and Redis is reachable, then try again.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-4 text-center shadow-lg shadow-indigo-500/25">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-fuchsia-400/20 blur-xl"
              aria-hidden
            />
            <Sparkles
              className="relative mx-auto mb-2 h-6 w-6 text-amber-200 drop-shadow-md"
              strokeWidth={2}
              aria-hidden
            />
            <p className="relative text-base font-semibold tracking-tight text-white drop-shadow-sm">
              {label}
            </p>
            <p className="relative mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-indigo-100/95">
              Smart breakdown
            </p>
          </div>

          <SectionCard
            variant="answer"
            title="Answer"
            text={content.answer}
            icon={CheckCircle2}
          />
          <SectionCard
            variant="explain"
            title="Explanation"
            text={content.explanation}
            icon={Sparkles}
          />
          <SectionCard
            variant="concept"
            title="Concept"
            text={content.concept}
            icon={BookOpen}
          />
          <SectionCard
            variant="example"
            title="Example"
            text={content.example}
            icon={Quote}
          />
        </div>
      )}
    </Modal>
  );
}
