"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

const STORAGE_KEY = "pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  return Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

type Props = {
  /** `guest` = only when not logged in; `authed` = only when logged in. */
  audience: "guest" | "authed";
};

export function PwaInstallCallout({ audience }: Props) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"chrome" | "ios" | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    if (isStandalone()) return;

    const authed = Boolean(getToken());
    if (audience === "guest" && authed) return;
    if (audience === "authed" && !authed) return;

    if (isIos()) {
      setMode("ios");
      setVisible(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("chrome");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [audience]);

  const onInstallClick = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user dismissed native UI */
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  };

  if (!visible || !mode) return null;

  return (
    <div
      className="rounded-2xl border border-sky-200/90 bg-sky-50/95 px-4 py-3 text-sm text-sky-950 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100"
      role="region"
      aria-label="Install app"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">Install PrepMaster</p>
          {mode === "ios" ? (
            <p className="mt-1 text-xs text-sky-900/90 dark:text-sky-200/90">
              Tap <span className="font-medium">Share</span>, then{" "}
              <span className="font-medium">Add to Home Screen</span> for a
              full-screen app experience.
            </p>
          ) : (
            <p className="mt-1 text-xs text-sky-900/90 dark:text-sky-200/90">
              Add PrepMaster to your home screen for quick access and a cleaner
              full-screen UI.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {mode === "chrome" && deferred ? (
            <button
              type="button"
              onClick={() => void onInstallClick()}
              className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 active:scale-[0.98] dark:bg-sky-500 dark:hover:bg-sky-400"
            >
              Install
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl border border-sky-300/80 bg-white px-4 py-2 text-xs font-medium text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-900 dark:text-sky-100 dark:hover:bg-sky-800"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
