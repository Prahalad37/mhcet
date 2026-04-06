"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Extra classes for the scrollable body wrapper */
  bodyClassName?: string;
  surfaceClassName?: string;
  headerClassName?: string;
  backdropClassName?: string;
  /** When true, use larger max width and Google-style shell */
  wide?: boolean;
};

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  bodyClassName = "",
  surfaceClassName = "",
  headerClassName = "",
  backdropClassName = "",
  wide = false,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className={`explain-modal-backdrop animate-modal-backdrop-in absolute inset-0 bg-black/30 backdrop-blur-md ${backdropClassName}`}
        onClick={onClose}
      />
      <div
        className={`explain-modal-panel animate-modal-panel-in relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[1.25rem] border border-zinc-200/90 bg-white shadow-[0_8px_40px_-8px_rgba(0,0,0,0.12),0_24px_60px_-16px_rgba(0,0,0,0.08)] dark:border-zinc-700/90 dark:bg-zinc-950 dark:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.4)] ${
          wide ? "max-w-2xl" : "max-w-lg"
        } ${surfaceClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/80 sm:px-6 ${headerClassName}`}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <h2
              id="modal-title"
              className="text-[1.05rem] font-medium tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            className="!h-9 !w-9 shrink-0 !rounded-full !p-0 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="text-lg leading-none" aria-hidden>
              ×
            </span>
          </Button>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 ${bodyClassName}`}
        >
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800/80 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
