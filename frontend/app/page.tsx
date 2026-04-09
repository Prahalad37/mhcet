import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/siteUrl";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: {
    absolute: "MHCET Law PrepMaster | Premium Mock Exams",
  },
  description:
    "Premium MHCET Law (5-Year LLB) mock tests with a server-synced timer, AI explanations, and focus mode. Start free — upgrade when you are ready.",
  keywords: [
    "MHCET Law",
    "MHCET mock test",
    "5 year LLB Maharashtra",
    "law entrance mock",
    "MH CET Law preparation",
    "timed mock exam",
    "AI explanations",
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
  alternates: {
    canonical: siteUrl,
  },
};

const features = [
  {
    title: "Server-synced timer",
    desc: "The clock is authoritative on our servers — finish on time, every time, with no client drift games.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
      </svg>
    ),
  },
  {
    title: "AI explanations",
    desc: "Structured breakdowns after submission — concepts, examples, and the “why” behind each answer (when enabled on the server).",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "Focus mode",
    desc: "Exam-style full-screen flow with fewer distractions — stay in the zone for Legal Aptitude, GK, and reasoning blocks.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
];

const trustStats = [
  { value: "10k+", label: "Practice questions (growing bank)" },
  { value: "Server", label: "Authoritative scoring & snapshots" },
  { value: "24/7", label: "Mocks on your schedule" },
];

export default function MarketingHomePage() {
  return (
    <div className="space-y-24 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/8 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 pt-14 text-center sm:pt-20">
          <div className="fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/80 px-4 py-1.5 text-xs font-semibold text-indigo-800 shadow-sm backdrop-blur dark:border-indigo-800/60 dark:bg-indigo-950/60 dark:text-indigo-200">
            <span className="badge-live h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            MHCET Law · 5-Year LLB · 2026 cycle
          </div>

          <h1 className="fade-up fade-up-1 text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Premium{" "}
            <span className="gradient-text">MHCET Law</span> mock tests — timed like the real hall
          </h1>

          <p className="fade-up fade-up-2 mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Practice Legal Aptitude, GK, and reasoning with full-length mocks, instant scoring, and review
            flows designed for serious aspirants — not generic quiz apps.
          </p>

          <div className="fade-up fade-up-3 mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn-primary px-8 py-3.5 text-[0.9375rem]">
              Start free mock test
            </Link>
            <Link
              href="/tests"
              className="rounded-xl border border-zinc-200 bg-white px-8 py-3.5 text-[0.9375rem] font-semibold text-zinc-800 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
            >
              Browse catalog
            </Link>
          </div>

          <p className="fade-up fade-up-4 mt-8 text-xs text-zinc-500 dark:text-zinc-500">
            No credit card for the free tier · Results & analytics in minutes
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Why PrepMaster</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Built for exam day — not just another practice app
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Every session is engineered around integrity: authoritative timers, immutable results, and optional AI
            explanations when your backend is configured.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="glass-card fade-up flex flex-col p-6 text-left"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="rounded-3xl border border-zinc-200/80 bg-white/70 p-8 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/50 sm:p-10">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Trusted by serious aspirants</p>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {trustStats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <blockquote className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-5 text-left text-sm leading-relaxed text-zinc-700 dark:border-white/5 dark:bg-zinc-950/40 dark:text-zinc-300">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">“Finally mocks that feel like the real paper.”</p>
              <p className="mt-2 text-zinc-500 dark:text-zinc-500">— Aspirant, Pune (placeholder testimonial)</p>
            </blockquote>
            <blockquote className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-5 text-left text-sm leading-relaxed text-zinc-700 dark:border-white/5 dark:bg-zinc-950/40 dark:text-zinc-300">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">“Timer + review flow helped me fix silly mistakes.”</p>
              <p className="mt-2 text-zinc-500 dark:text-zinc-500">— Aspirant, Mumbai (placeholder testimonial)</p>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Pricing</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Start free. Upgrade when you are all-in.
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card flex flex-col p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Free</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">₹0</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Perfect to experience the platform</p>
            <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-2">
                <span className="text-emerald-500" aria-hidden>✓</span>
                Limited full mocks per day (UTC) — see app for current cap
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500" aria-hidden>✓</span>
                Timed attempts, scoring, and attempt history
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500" aria-hidden>✓</span>
                Static explanations where available in the question bank
              </li>
            </ul>
            <Link href="/register" className="btn-primary mt-8 w-full justify-center py-3">
              Start with Free
            </Link>
          </div>

          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-indigo-300/60 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 shadow-lg dark:border-indigo-800/50 dark:from-indigo-950/50 dark:via-zinc-950 dark:to-violet-950/40">
            <div className="absolute right-4 top-4 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Popular
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Premium</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">Unlimited mocks</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">For candidates who want unrestricted daily practice</p>
            <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-zinc-800 dark:text-zinc-200">
              <li className="flex gap-2">
                <span className="text-indigo-500" aria-hidden>✓</span>
                No daily mock cap — attempt as many full tests as you need
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500" aria-hidden>✓</span>
                Priority access to new mocks and syllabus updates
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500" aria-hidden>✓</span>
                Same AI explanation pipeline when enabled server-side
              </li>
            </ul>
            <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
              Billing is managed by your team in production — this card is a product outline for the funnel.
            </p>
            <Link
              href="/register"
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500"
            >
              Create account — we will notify you for Premium
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-2xl px-4 text-center">
        <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-purple-50/70 p-10 dark:border-indigo-800/40 dark:from-indigo-950/50 dark:to-purple-950/30">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">One mock away from better accuracy</h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Join in under a minute. Your next attempt syncs across devices with the same secure, server-backed clock.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary px-8 py-3">
              Start free mock test
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-200 bg-white px-8 py-3 text-sm font-semibold text-zinc-800 transition-all hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
