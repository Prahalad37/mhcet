import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteNav } from "@/components/layout/SiteNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ClientRootChrome } from "@/components/providers/ClientRootChrome";
import { ProductionAnalytics } from "@/components/analytics/ProductionAnalytics";
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
    default: "MHCET Law PrepMaster | Premium Mock Exams",
    template: "%s · PrepMaster",
  },
  description:
    "Premium MHCET Law (5-Year LLB) mock tests — server-synced timer, AI explanations, and focus mode. Practice Legal Aptitude & more.",
  keywords: [
    "MHCET Law",
    "MHCET mock test",
    "5 year LLB",
    "Maharashtra law entrance",
    "timed mock exam",
    "PrepMaster",
  ],
  openGraph: {
    title: "MHCET Law PrepMaster | Premium Mock Exams",
    description:
      "Server-synced mocks, AI explanations, and focus mode — built for Maharashtra's 5-year LLB aspirants.",
    url: siteUrl,
    siteName: "PrepMaster",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MHCET Law PrepMaster | Premium Mock Exams",
    description:
      "Server-synced mocks, AI explanations, and focus mode — built for Maharashtra's 5-year LLB aspirants.",
  },
};

// Separate viewport export — the Next.js 14 way to set <meta name="viewport">
export const viewport: Viewport = {
  // viewport-fit=cover: content extends edge-to-edge under iPhone notch/home bar
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Tints Safari's address bar / status bar to match the app
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        {/* iOS PWA / standalone mode */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PrepMaster" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Prevents iOS from auto-linking phone numbers / addresses */}
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-zinc-50 font-sans antialiased dark:bg-zinc-950 overscroll-none touch-manipulation`}
      >
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] translate-y-[-100vh] rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-transform focus:translate-y-0 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-sky-500"
        >
          Skip to main content
        </a>
        <SiteNav />
        <ClientRootChrome
          showDevApiLog={process.env.NODE_ENV === "development"}
        />
        {/* pb-24 on mobile = BottomNav height + safe-area + breathing room; md:pb-8 restores desktop */}
        <main
          id="main-content"
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 md:pb-8"
          tabIndex={-1}
        >
          {children}
        </main>
        {/* Footer: hidden on mobile — BottomNav is the primary nav there */}
        <div className="hidden md:block">
          <SiteFooter />
        </div>
        {/* iOS Bottom Tab Bar — md:hidden inside the component */}
        <BottomNav />
        <ProductionAnalytics />
      </body>
    </html>
  );
}
