"use client";

import type { ReactNode } from "react";
import { LocaleProvider, useLocale } from "@/components/providers/LocaleProvider";
import { SiteNav } from "@/components/layout/SiteNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ClientRootChrome } from "@/components/providers/ClientRootChrome";
import { ProductionAnalytics } from "@/components/analytics/ProductionAnalytics";

function SkipLink() {
  const { t } = useLocale();
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-4 z-[100] translate-y-[-100vh] rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-transform focus:translate-y-0 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-sky-500"
    >
      {t("skipToMain")}
    </a>
  );
}

function ShellInner({
  children,
  showDevApiLog,
}: {
  children: ReactNode;
  showDevApiLog: boolean;
}) {
  return (
    <>
      <SkipLink />
      <SiteNav />
      <ClientRootChrome showDevApiLog={showDevApiLog} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 md:pb-8"
        tabIndex={-1}
      >
        {children}
      </main>
      <div id="site-footer-wrap" className="hidden md:block">
        <SiteFooter />
      </div>
      <BottomNav />
      <ProductionAnalytics />
    </>
  );
}

export function ShellWithLocale({
  children,
  showDevApiLog,
}: {
  children: ReactNode;
  showDevApiLog: boolean;
}) {
  return (
    <LocaleProvider>
      <ShellInner showDevApiLog={showDevApiLog}>{children}</ShellInner>
    </LocaleProvider>
  );
}
