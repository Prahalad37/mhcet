"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppLocale } from "@/lib/localeStorage";
import { readStoredLocale, writeStoredLocale } from "@/lib/localeStorage";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";

const TABLES: Record<AppLocale, Record<string, string>> = {
  en: en as Record<string, string>,
  hi: hi as Record<string, string>,
};

function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "hi" ? "hi" : "en";
  }, [locale]);

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    writeStoredLocale(l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const table = TABLES[locale] ?? TABLES.en;
      const fallback = TABLES.en[key];
      const raw = table[key] ?? fallback ?? key;
      return interpolate(raw, vars);
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
