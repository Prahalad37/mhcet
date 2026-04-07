import Link from "next/link";

const features = [
  {
    icon: "⚡",
    title: "Timed Mock Tests",
    desc: "Full-length UPSC & MHCET Law mocks with real exam timings and question patterns.",
  },
  {
    icon: "🎯",
    title: "Smart Recommendations",
    desc: "Practice engine identifies your weak topics and surfaces the right tests for you.",
  },
  {
    icon: "📝",
    title: "Build Your Own Mocks",
    desc: "Create private custom tests with your own questions. Add markdown & equations.",
  },
  {
    icon: "📊",
    title: "Detailed Analytics",
    desc: "Review every answer after submission. See correct options and official explanations.",
  },
];

const subjects = [
  { label: "Legal Aptitude", color: "from-violet-500 to-purple-600", icon: "⚖️" },
  { label: "Current Affairs", color: "from-blue-500 to-cyan-600", icon: "🌐" },
  { label: "Geography", color: "from-emerald-500 to-teal-600", icon: "🗺️" },
  { label: "Indian Polity", color: "from-orange-500 to-amber-600", icon: "🏛️" },
  { label: "History", color: "from-rose-500 to-pink-600", icon: "📜" },
  { label: "Economics", color: "from-indigo-500 to-blue-600", icon: "📈" },
];

export default function Home() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/8 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-cyan-500/6 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 pt-16 pb-4 text-center sm:pt-24">
          <div className="fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/50 dark:text-indigo-300">
            <span className="badge-live h-1.5 w-1.5 rounded-full bg-indigo-500" />
            UPSC Civil Services · MHCET Law 2026
          </div>

          <h1 className="fade-up fade-up-1 text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
            Ace Your Exam with{" "}
            <span className="gradient-text">Smart Mock Tests</span>
          </h1>

          <p className="fade-up fade-up-2 mx-auto mt-6 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
            Massive question banks across Legal Aptitude, Geography, Polity and Current Affairs.
            Timed tests, real patterns, instant results.
          </p>

          <div className="fade-up fade-up-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn-primary px-6 py-3 text-sm">
              Start for free →
            </Link>
            <Link
              href="/tests"
              className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
            >
              Browse tests
            </Link>
          </div>

          {/* Social proof */}
          <p className="fade-up fade-up-4 mt-6 text-xs text-zinc-400 dark:text-zinc-500">
            Covering UPSC Prelims, MHCET Law 3-year & 5-year patterns
          </p>
        </div>
      </section>

      {/* Subject pills */}
      <section className="mx-auto max-w-5xl px-4">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Subjects covered
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {subjects.map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-2 rounded-xl bg-gradient-to-r ${s.color} px-4 py-2 text-sm font-semibold text-white shadow-sm`}
            >
              <span>{s.icon}</span>
              {s.label}
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-5xl px-4">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Everything you need to crack the exam
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`glass-card fade-up p-5`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-4 text-center">
        <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-purple-50/60 p-10 dark:border-indigo-800/40 dark:from-indigo-950/60 dark:to-purple-950/40">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Ready to start preparing?
          </h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Create a free account and take your first mock test in under a minute.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary px-6 py-3">
              Create free account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
