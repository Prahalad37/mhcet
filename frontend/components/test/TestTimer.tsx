"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  endsAtMs: number;
  onExpire: () => void;
  /** High-contrast styling for dark exam header (Focus mode). */
  variant?: "default" | "onDark";
};

function format(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TestTimer({ endsAtMs, onExpire, variant = "default" }: Props) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000))
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
  }, [endsAtMs]);

  useEffect(() => {
    setRemaining(
      Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000))
    );
  }, [endsAtMs]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
      setRemaining(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        window.clearInterval(id);
        onExpire();
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [endsAtMs, onExpire]);

  const urgent = remaining > 0 && remaining <= 60;
  const onDark = variant === "onDark";

  return (
    <div
      role="timer"
      aria-label={`Time left, ${format(remaining)}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 shadow-sm transition-colors duration-200 sm:gap-2.5 sm:rounded-xl sm:px-4 sm:py-2 ${
        onDark
          ? urgent
            ? "border-red-500/70 bg-red-950/70"
            : "border-emerald-800/50 bg-zinc-800/90"
          : urgent
            ? "border-red-300/90 bg-red-50/95 dark:border-red-800/80 dark:bg-red-950/60"
            : "border-zinc-200/80 bg-zinc-50/95 dark:border-zinc-700/80 dark:bg-zinc-900/90"
      }`}
    >
      <span
        className={`text-[10px] font-medium sm:text-xs ${
          onDark ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        <span className="sm:hidden">Time</span>
        <span className="hidden sm:inline">Time left</span>
      </span>
      <span
        className={`font-mono text-sm font-bold tabular-nums tracking-tight sm:text-lg ${
          onDark
            ? urgent
              ? "text-red-300"
              : "text-emerald-100"
            : urgent
              ? "text-red-700 dark:text-red-200"
              : "text-zinc-900 dark:text-zinc-50"
        }`}
        aria-live="polite"
        aria-atomic="true"
      >
        {format(remaining)}
      </span>
    </div>
  );
}
