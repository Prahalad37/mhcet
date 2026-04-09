"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Globe,
  Loader2,
  Plus,
  Power,
  Users,
} from "lucide-react";
import {
  createTenant,
  getTenants,
  updateTenantStatus,
} from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminTenant } from "@/lib/types";
import { toastErrorSafe, toastSuccessSafe } from "@/lib/sonnerToast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { PageErrorState } from "@/components/ui/PageErrorState";
import { Alert } from "@/components/ui/Alert";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="animate-pulse px-4 py-4 sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
          >
            <div className="h-4 rounded bg-zinc-200/80 dark:bg-zinc-700/80" />
            <div className="mt-3 h-4 rounded bg-zinc-200/80 dark:bg-zinc-700/80 sm:mt-0" />
            <div className="mt-3 h-4 rounded bg-zinc-200/80 dark:bg-zinc-700/80 sm:mt-0" />
            <div className="mt-3 h-8 w-20 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/80 sm:mt-0" />
            <div className="mt-3 h-9 w-28 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/80 sm:mt-0 sm:justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDomain, setFormDomain] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (e) {
      setError(
        getUserErrorMessage(e, { fallback: "Could not load tenants." })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const name = formName.trim();
    if (!name || createSubmitting) return;
    setCreateSubmitting(true);
    try {
      const domain = formDomain.trim();
      const created = await createTenant({
        name,
        ...(domain ? { domain } : {}),
      });
      setTenants((prev) => (prev ? [created, ...prev] : [created]));
      setCreateOpen(false);
      setFormName("");
      setFormDomain("");
      toastSuccessSafe("Tenant created");
    } catch (e) {
      toastErrorSafe(
        getUserErrorMessage(e, { fallback: "Could not create tenant." })
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleStatus = async (t: AdminTenant, next: "active" | "inactive") => {
    if (rowBusyId || t.status === next) return;
    setRowBusyId(t.id);
    try {
      const updated = await updateTenantStatus(t.id, next);
      setTenants((prev) =>
        prev?.map((x) => (x.id === updated.id ? updated : x)) ?? null
      );
      toastSuccessSafe(
        next === "active" ? "Tenant activated" : "Tenant deactivated"
      );
    } catch (e) {
      toastErrorSafe(
        getUserErrorMessage(e, { fallback: "Could not update status." })
      );
    } finally {
      setRowBusyId(null);
    }
  };

  if (loading && tenants === null) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Tenants
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Coaching institutes (B2B). B2C users stay on the platform without a tenant.
            </p>
          </div>
          <div className="h-10 w-36 animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-700/80" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <PageErrorState
        message={error}
        onRetry={() => void load()}
        backHref="/admin"
        backLabel="Back to dashboard"
      />
    );
  }

  const list = tenants ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tenants
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Create and manage coaching institutes. User counts reflect accounts
            assigned via <span className="font-medium">Users</span> → tenant.
          </p>
        </div>
        <Button
          type="button"
          className="inline-flex items-center gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add tenant
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <Building2
            className="h-12 w-12 text-zinc-400 dark:text-zinc-500"
            strokeWidth={1.25}
            aria-hidden
          />
          <p className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
            No tenants yet
          </p>
          <p className="mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
            Add your first coaching institute to start assigning learners under a
            B2B org.
          </p>
          <Button
            type="button"
            className="mt-6 inline-flex items-center gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create tenant
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {list.map((t) => {
                const busy = rowBusyId === t.id;
                return (
                  <tr
                    key={t.id}
                    className="bg-white transition-colors hover:bg-zinc-50/80 dark:bg-zinc-950 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      <span title={t.id}>{shortId(t.id)}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {t.domain ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          {t.domain}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 opacity-70" />
                        {t.userCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          t.status === "active"
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === "active" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="inline-flex items-center gap-1.5 text-xs"
                          disabled={busy}
                          onClick={() => void handleStatus(t, "inactive")}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-xs"
                          disabled={busy}
                          onClick={() => void handleStatus(t, "active")}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => !createSubmitting && setCreateOpen(false)}
        title="New tenant"
        subtitle="Coaching institute or B2B organization."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={createSubmitting}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createSubmitting || !formName.trim()}
              onClick={() => void handleCreate()}
            >
              {createSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create tenant"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert
            message="Custom domain must be unique. Leave blank if not configured yet."
            variant="info"
          />
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Institute name
            </label>
            <Input
              className="mt-1"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. ABC Law Academy"
              autoComplete="organization"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Custom domain (optional)
            </label>
            <Input
              className="mt-1"
              value={formDomain}
              onChange={(e) => setFormDomain(e.target.value)}
              placeholder="learn.abc-academy.in"
              autoComplete="off"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
