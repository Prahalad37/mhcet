export type AppLocale = "en" | "hi";

const STORAGE_KEY = "mhcet-locale";

export const LOCALE_CHANGE_EVENT = "mhcet-locale-changed";

/** Safe on SSR — returns default until browser reads storage. */
export function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "hi" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "en";
}

export function writeStoredLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: locale }));
  } catch {
    /* ignore */
  }
}
