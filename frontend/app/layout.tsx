import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AppToaster } from "@/components/providers/AppToaster";
import { BuildTimeApiUrlLog } from "@/components/providers/BuildTimeApiUrlLog";
import { getSiteUrl } from "@/lib/siteUrl";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PrepMaster: UPSC & Law Mock Tests",
    template: "%s · PrepMaster",
  },
  description:
    "Massive question banks and timer-based mock tests for UPSC Civil Services, MHCET Law, Current Affairs, and Geography.",
  openGraph: {
    title: "PrepMaster: UPSC & Law Mock Tests",
    description:
      "Massive question banks and timer-based mock tests for UPSC Civil Services, MHCET Law, Current Affairs, and Geography.",
    url: siteUrl,
    siteName: "PrepMaster",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrepMaster: UPSC & Law Mock Tests",
    description:
      "Massive question banks and timer-based mock tests for UPSC Civil Services, MHCET Law, Current Affairs, and Geography.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-zinc-50 font-sans antialiased dark:bg-zinc-950`}
      >
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] translate-y-[-100vh] rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-transform focus:translate-y-0 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-sky-500"
        >
          Skip to main content
        </a>
        <SiteNav />
        {process.env.NODE_ENV === "development" ? <BuildTimeApiUrlLog /> : null}
        <AppToaster />
        <main
          id="main-content"
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-8"
          tabIndex={-1}
        >
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
