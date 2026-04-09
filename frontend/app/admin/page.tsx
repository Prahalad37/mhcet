"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Building2,
  Database,
  Users,
} from "lucide-react";
import { getAdminStats, getTenants } from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminStats, AdminTenant } from "@/lib/types";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageErrorState } from "@/components/ui/PageErrorState";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTenants, setActiveTenants] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, tenants] = await Promise.all([
          getAdminStats(),
          getTenants().catch(() => [] as AdminTenant[]),
        ]);
        if (cancelled) return;
        setStats(data);
        setActiveTenants(
          tenants.filter((t) => t.status === "active").length
        );
      } catch (e) {
        if (!cancelled) {
          setError(
            getUserErrorMessage(e, { fallback: "Could not load dashboard stats." })
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const tenantsLabel =
    activeTenants === null ? "—" : `${activeTenants} active`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Overview of your PrepMaster platform
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <AdminStatCard
          title="Total users"
          value={stats.total_users}
          subtitle={`${stats.admin_users} admin${stats.admin_users !== 1 ? "s" : ""}`}
          href="/admin/users"
          icon={Users}
          variant="indigo"
        />
        <AdminStatCard
          title="Active tests"
          value={stats.active_tests}
          subtitle={`${stats.total_tests} total in catalog`}
          href="/admin/tests"
          icon={BookOpen}
          variant="emerald"
        />
        <AdminStatCard
          title="Active tenants"
          value={activeTenants ?? 0}
          subtitle={tenantsLabel}
          href="/admin/tenants"
          icon={Building2}
          variant="violet"
        />
        <AdminStatCard
          title="Questions"
          value={stats.total_questions}
          subtitle="In database"
          icon={Database}
          variant="amber"
        />
        <AdminStatCard
          title="Attempts"
          value={stats.total_attempts}
          subtitle={`${stats.completed_attempts} completed`}
          icon={BarChart3}
          variant="rose"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/tests/new"
            className="flex items-center gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950"
          >
            <span className="text-2xl">➕</span>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Create test
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Add a new mock test
              </p>
            </div>
          </Link>

          <Link
            href="/admin/import"
            className="flex items-center gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950"
          >
            <span className="text-2xl">📤</span>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Import questions
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Bulk upload via CSV
              </p>
            </div>
          </Link>

          <Link
            href="/admin/audit"
            className="flex items-center gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950"
          >
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Audit logs
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Track admin actions
              </p>
            </div>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Platform overview
        </h2>
        <div className="mt-4 grid gap-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-600 dark:text-zinc-400">
              Practice sessions
            </span>
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {stats.practice_sessions.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-600 dark:text-zinc-400">
              Completion rate
            </span>
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {stats.total_attempts > 0
                ? `${Math.round(
                    (stats.completed_attempts / stats.total_attempts) * 100
                  )}%`
                : "N/A"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-600 dark:text-zinc-400">
              Avg questions per test
            </span>
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {stats.total_tests > 0
                ? Math.round(stats.total_questions / stats.total_tests)
                : 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
