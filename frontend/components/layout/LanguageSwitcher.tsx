"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { AppLocale } from "@/lib/localeStorage";

type Props = {
  /** Tighter padding for exam header / mobile. */
  compact?: boolean;
  /** Dark chrome (Focus exam header). */
  dark?: boolean;
};

export function LanguageSwitcher({ compact, dark }: Props) {
  const { locale, setLocale, t } = useLocale();

  const btn = (code: AppLocale, label: string) => {
    const active = locale === code;
    const size = compact
      ? "min-h-[36px] min-w-[40px] px-2 text-xs font-bold"
      : "min-h-[40px] min-w-[44px] px-2.5 text-sm font-bold";
    const tone = dark
      ? active
        ? "bg-emerald-600 text-white"
        : "text-zinc-300 hover:bg-zinc-800"
      : active
        ? "bg-indigo-600 text-white"
        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800";
    return (
      <button
        key={code}
        type="button"
        aria-pressed={active}
        aria-label={label}
        onClick={() => setLocale(code)}
        className={`${size} rounded-md transition-colors ${tone}`}
      >
        {code === "en" ? t("lang.en") : t("lang.hi")}
      </button>
    );
  };

  return (
    <div
      className={`inline-flex items-center gap-0.5 border p-0.5 ${
        compact ? "rounded-lg" : "rounded-xl sm:p-1"
      } ${dark ? "border-zinc-600" : "border-zinc-200 dark:border-zinc-700"}`}
      role="group"
      aria-label={t("lang.label")}
    >
      {btn("en", "English")}
      {btn("hi", "Hindi")}
    </div>
  );
}
