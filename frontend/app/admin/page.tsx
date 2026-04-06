"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminStats } from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminStats } from "@/lib/types";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageErrorState } from "@/components/ui/PageErrorState";

function StatCard({ 
  title, 
  value, 
  subtitle, 
  href, 
  color = "sky" 
}: { 
  title: string; 
  value: number; 
  subtitle?: string; 
  href?: string;
  color?: "sky" | "emerald" | "amber" | "rose";
}) {
  const colorClasses = {
    sky: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100",
    rose: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100",
  };
  
  const content = (
    <div className={`rounded-2xl border p-5 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium opacity-80">{title}</h3>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value.toLocaleString()}</p>
      {subtitle && (
        <p className="mt-1 text-xs opacity-70">{subtitle}</p>
      )}
    </div>
  );
  
  if (href) {
    return <Link href={href} className="transition-transform hover:scale-105">{content}</Link>;
  }
  
  return content;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAdminStats();
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) {
          setError(getUserErrorMessage(e, { fallback: "Could not load dashboard stats." }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageLoadingState label="Loading dashboard" />;
  
  if (error || !stats) {
    return (
      <PageErrorState
        message={error || "Could not load dashboard"}
        onRetry={() => window.location.reload()}
        backHref="/tests"
        backLabel="Back to app"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Overview of your MHCET Law Mock platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.total_users}
          subtitle={`${stats.admin_users} admin${stats.admin_users !== 1 ? 's' : ''}`}
          href="/admin/users"
          color="sky"
        />
        <StatCard
          title="Tests"
          value={stats.total_tests}
          subtitle={`${stats.active_tests} active`}
          href="/admin/tests"
          color="emerald"
        />
        <StatCard
          title="Questions"
          value={stats.total_questions}
          subtitle="Total in database"
          color="amber"
        />
        <StatCard
          title="Attempts"
          value={stats.total_attempts}
          subtitle={`${stats.completed_attempts} completed`}
          color="rose"
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/tests/new"
            className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          >
            <span className="text-2xl">➕</span>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Create Test
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Add a new mock test
              </p>
            </div>
          </Link>
          
          <Link
            href="/admin/import"
            className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          >
            <span className="text-2xl">📤</span>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Import Questions
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Bulk upload via CSV
              </p>
            </div>
          </Link>
          
          <Link
            href="/admin/audit"
            className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          >
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                View Audit Logs
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Track admin actions
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Platform Overview
        </h2>
        <div className="mt-4 grid gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Practice Sessions</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {stats.practice_sessions.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Completion Rate</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {stats.total_attempts > 0 
                ? `${Math.round((stats.completed_attempts / stats.total_attempts) * 100)}%`
                : "N/A"
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Avg Questions per Test</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {stats.total_tests > 0 
                ? Math.round(stats.total_questions / stats.total_tests)
                : 0
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}