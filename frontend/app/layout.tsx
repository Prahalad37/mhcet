import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ShellWithLocale } from "@/components/layout/ShellWithLocale";
import { getSiteUrl } from "@/lib/siteUrl";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

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
  /** PWA / iOS — must live in metadata API, not a manual <head>, or Next may omit global CSS <link>s. */
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PrepMaster",
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
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
      <body
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-zinc-50 font-sans antialiased dark:bg-zinc-950 overscroll-none touch-manipulation`}
      >
        <ShellWithLocale showDevApiLog={process.env.NODE_ENV === "development"}>
          {children}
        </ShellWithLocale>
      </body>
    </html>
  );
}
