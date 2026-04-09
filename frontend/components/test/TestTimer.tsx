"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  endsAtMs: number;
  onExpire: () => void;
};

function format(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TestTimer({ endsAtMs, onExpire }: Props) {
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

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-xl border px-4 py-2 shadow-sm transition-colors duration-200 ${
        urgent
          ? "border-red-300/90 bg-red-50/95 dark:border-red-800/80 dark:bg-red-950/60"
          : "border-zinc-200/80 bg-zinc-50/95 dark:border-zinc-700/80 dark:bg-zinc-900/90"
      }`}
    >
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Time left
      </span>
      <span
        className={`font-mono text-lg font-bold tabular-nums tracking-tight ${
          urgent
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
