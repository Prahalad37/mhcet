"use client";

import type { AiExplainResult } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  content: AiExplainResult;
};

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <div className="mt-2.5 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-zinc-800 dark:text-zinc-200">
        {text}
      </div>
    </div>
  );
}

export function AiExplanationModal({ open, onClose, label, content }: Props) {
  const meta =
    content.cached === true
      ? "Served from cache — no extra AI usage."
      : "Generated for this question — counts toward your daily quota when the API uses a live model.";
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="AI explanation"
      subtitle={meta}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
          {label}
        </p>
        <Section title="Answer" text={content.answer} />
        <Section title="Explanation" text={content.explanation} />
        <Section title="Concept" text={content.concept} />
        <Section title="Example" text={content.example} />
      </div>
    </Modal>
  );
}
