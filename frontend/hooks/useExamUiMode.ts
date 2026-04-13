"use client";

import { useSyncExternalStore } from "react";

export type ExamUiMode = "normal" | "focus" | null;

function getExamUiFromDom(): ExamUiMode {
  if (typeof document === "undefined") return null;
  const v = document.documentElement.dataset.examUi;
  if (v === "focus" || v === "normal") return v;
  return null;
}

function subscribe(onChange: () => void) {
  const el = document.documentElement;
  const mo = new MutationObserver(onChange);
  mo.observe(el, { attributes: true, attributeFilter: ["data-exam-ui"] });
  return () => mo.disconnect();
}

/**
 * Mirrors `document.documentElement.dataset.examUi` ("normal" | "focus") set by the take page while an attempt is active.
 */
export function useExamUiMode(): ExamUiMode {
  return useSyncExternalStore(
    subscribe,
    getExamUiFromDom,
    () => null
  );
}
