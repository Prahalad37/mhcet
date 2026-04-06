"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  officialExplanation: string;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <div className="mt-2.5 text-[0.9375rem] leading-relaxed text-zinc-800 dark:text-zinc-200">
        {children}
      </div>
    </div>
  );
}

export function StaticExplanationModal({
  open,
  onClose,
  label,
  officialExplanation,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Explanation"
      subtitle="Built-in note — no AI required."
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
        <Section title="Explanation">
          <p className="whitespace-pre-wrap">{officialExplanation.trim()}</p>
        </Section>
      </div>
    </Modal>
  );
}
