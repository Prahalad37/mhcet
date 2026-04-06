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
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-mono font-medium ${
        urgent
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
          : "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      }`}
    >
      <span className="text-xs font-sans text-zinc-500 dark:text-zinc-400">
        Time left
      </span>
      {format(remaining)}
    </div>
  );
}
