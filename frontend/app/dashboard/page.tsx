"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDashboard, type DashboardData } from "@/lib/dashboardApi";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { useClientMounted } from "@/lib/useClientMounted";

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function AccuracyBar({ pct }: { pct: number }) {
  const color =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 50
      ? "bg-amber-400"
      : "bg-rose-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="glass-card flex items-start gap-3 p-4">
      <span className="mt-0.5 text-xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-zinc-400">{sub}</p>}
      </div>
    </div>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-40 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const mounted = useClientMounted();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (!getToken()) {
      redirectToLogin(router, { next: "/dashboard" });
      return;
    }
    getDashboard()
      .then(setData)
      .catch(() => setError("Could not load dashboard."))
      .finally(() => setLoading(false));
  }, [mounted, router]);

  if (!mounted || !getToken()) return <Skeleton />;
  if (loading) return <Skeleton />;

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-800/40 dark:bg-rose-950/30">
        <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error ?? "Something went wrong."}</p>
        <button
          onClick={() => { setError(null); setLoading(true); getDashboard().then(setData).catch(() => setError("Could not load dashboard.")).finally(() => setLoading(false)); }}
          className="mt-3 text-xs text-rose-600 underline dark:text-rose-400"
        >
          Try again
        </button>
      </div>
    );
  }

  const { stats, recentAttempts, weakSubjects, inProgress, nextTest } = data;
  const isNewUser = stats.totalTests === 0 && stats.practiceAnswered === 0;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Greeting & resume banner ─────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {isNewUser ? "Welcome 👋" : "Dashboard"}
          </h1>
          {isNewUser && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Your progress will show up here after your first test.
            </p>
          )}
        </div>

        {inProgress && (
          <Link
            href={`/tests/${inProgress.testId}/take?attemptId=${inProgress.attemptId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition-all hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <span>⏱</span>
            <span className="max-w-[180px] truncate">Resume: {inProgress.title}</span>
            <span>→</span>
          </Link>
        )}
      </div>

      {/* ── 4 stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon="📝"
          label="Tests taken"
          value={stats.totalTests}
          sub={stats.totalTests === 0 ? "Start your first test" : undefined}
        />
        <StatCard
          icon="🎯"
          label="Accuracy"
          value={stats.overallAccuracy !== null ? `${stats.overallAccuracy}%` : "—"}
          sub={stats.overallAccuracy !== null ? "across all tests" : "no data yet"}
        />
        <StatCard
          icon="⚡"
          label="Practice Qs"
          value={stats.practiceAnswered}
          sub="answered in practice mode"
        />
        <StatCard
          icon="📅"
          label="Active days"
          value={stats.activeDays}
          sub="days with at least 1 test"
        />
      </div>

      {/* ── Next test CTA ─────────────────────────────────────── */}
      {nextTest && (
        <div className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {isNewUser ? "Start here" : "Suggested next"}
            </p>
            <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50 truncate">
              {nextTest.title}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {nextTest.questionCount} questions · {Math.ceil(nextTest.durationSeconds / 60)} min · {nextTest.topic}
            </p>
          </div>
          <Link
            href={`/tests/${nextTest.id}/take`}
            className="btn-primary shrink-0 !py-2 !px-5"
          >
            Start test →
          </Link>
        </div>
      )}

      {/* ── Recent attempts ──────────────────────────────────── */}
      {recentAttempts.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Recent tests</h2>
            <Link href="/attempts" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              View all →
            </Link>
          </div>
          <ul className="space-y-2">
            {recentAttempts.map((a) => (
              <li key={a.attemptId}>
                <Link
                  href={`/attempts/${a.attemptId}/results`}
                  className="glass-card flex items-center gap-4 p-4 !rounded-xl hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  {/* Score circle */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    a.accuracy === null ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800" :
                    a.accuracy >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" :
                    a.accuracy >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" :
                    "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}>
                    {a.accuracy !== null ? `${a.accuracy}%` : "—"}
                  </div>
                  {/* Label */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {a.title}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {a.score}/{a.total} correct · {relativeTime(a.submittedAt)}
                    </p>
                  </div>
                  <span className="text-zinc-300 dark:text-zinc-600">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Weak subjects ─────────────────────────────────────── */}
      {weakSubjects.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Needs work</h2>
          <div className="glass-card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {weakSubjects.map((s) => (
              <div key={s.subject} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{s.subject}</p>
                    <span className={`shrink-0 text-xs font-bold ${
                      s.accuracy >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                      s.accuracy >= 50 ? "text-amber-600 dark:text-amber-400" :
                      "text-rose-600 dark:text-rose-400"
                    }`}>
                      {s.accuracy}%
                    </span>
                  </div>
                  <AccuracyBar pct={s.accuracy} />
                  <p className="text-[11px] text-zinc-400">{s.correct}/{s.attempted} correct</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            ⚡ Practice weak topics →
          </Link>
        </section>
      )}

      {/* ── First-time empty state ────────────────────────────── */}
      {isNewUser && !nextTest && (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-2xl">📚</p>
          <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No tests available yet
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Ask admin to add test content, or create your own via My Mocks.
          </p>
          <Link href="/my-mocks" className="btn-primary mt-4 inline-flex !py-2 !px-4 !text-xs">
            Create a mock →
          </Link>
        </div>
      )}

      {/* ── Quick links ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href="/tests"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          All tests
        </Link>
        <Link
          href="/practice"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          Practice mode
        </Link>
        <Link
          href="/attempts"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          Test history
        </Link>
      </div>
    </div>
  );
}
