"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, Pencil } from "lucide-react";
import {
  getAdminUsers,
  getTenants,
  updateUserPlan,
  updateUserRole,
  updateUserTenant,
} from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminTenant, AdminUser } from "@/lib/types";
import { toastErrorSafe, toastSuccessSafe } from "@/lib/sonnerToast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageErrorState } from "@/components/ui/PageErrorState";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [tenantModalUser, setTenantModalUser] = useState<AdminUser | null>(
    null
  );
  const [editTenantId, setEditTenantId] = useState<string>("");
  const [tenantSaveLoading, setTenantSaveLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userData, tenantData] = await Promise.all([
        getAdminUsers(),
        getTenants().catch(() => [] as AdminTenant[]),
      ]);
      setUsers(userData);
      setTenants(tenantData);
    } catch (e) {
      setError(
        getUserErrorMessage(e, { fallback: "Could not load users." })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openTenantModal = (user: AdminUser) => {
    setTenantModalUser(user);
    setEditTenantId(user.tenantId ?? "");
  };

  const closeTenantModal = () => {
    if (tenantSaveLoading) return;
    setTenantModalUser(null);
    setEditTenantId("");
  };

  const handleTenantSave = async () => {
    if (!tenantModalUser || tenantSaveLoading) return;
    const next =
      editTenantId === "" ? null : editTenantId;
    const current = tenantModalUser.tenantId ?? null;
    if (next === current) {
      closeTenantModal();
      return;
    }
    setTenantSaveLoading(true);
    try {
      const updated = await updateUserTenant(tenantModalUser.id, next);
      setUsers((prev) =>
        prev?.map((u) => (u.id === updated.id ? updated : u)) ?? null
      );
      toastSuccessSafe(
        next
          ? "User assigned to tenant"
          : "User set to B2C (PrepMaster platform)"
      );
      closeTenantModal();
    } catch (e) {
      toastErrorSafe(
        getUserErrorMessage(e, { fallback: "Could not update tenant." })
      );
    } finally {
      setTenantSaveLoading(false);
    }
  };

  const handlePlanChange = async (user: AdminUser, newPlan: "free" | "paid") => {
    if (actionLoading || user.plan === newPlan) return;
    const action =
      newPlan === "paid" ? "paid (unlimited mocks)" : "free (daily cap)";
    if (!confirm(`Set ${user.email} to ${action}?`)) return;
    setActionLoading(user.id);
    try {
      const updated = await updateUserPlan(user.id, newPlan);
      setUsers((prev) => prev?.map((u) => (u.id === user.id ? updated : u)) ?? null);
      toastSuccessSafe("Plan updated");
    } catch (e) {
      toastErrorSafe(
        getUserErrorMessage(e, { fallback: "Could not update plan." })
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (
    user: AdminUser,
    newRole: "user" | "admin"
  ) => {
    if (actionLoading || user.role === newRole) return;

    const action = newRole === "admin" ? "promote" : "demote";
    if (
      !confirm(
        `${action === "promote" ? "Promote" : "Demote"} ${user.email} ${
          action === "promote" ? "to admin" : "to regular user"
        }?`
      )
    ) {
      return;
    }

    setActionLoading(user.id);
    try {
      const updated = await updateUserRole(user.id, newRole);
      setUsers((prev) =>
        prev?.map((u) => (u.id === user.id ? updated : u)) ?? null
      );
      toastSuccessSafe(
        newRole === "admin" ? "Promoted to admin" : "Role set to user"
      );
    } catch (e) {
      toastErrorSafe(
        getUserErrorMessage(e, { fallback: `Could not ${action} user.` })
      );
    } finally {
      setActionLoading(null);
    }
  };

  function tenantLabel(u: AdminUser) {
    if (!u.tenantId) {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          B2C · PrepMaster
        </span>
      );
    }
    return (
      <span className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100">
        <Building2 className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate" title={u.tenantName || u.tenantId}>
          {u.tenantName || "B2B (unnamed)"}
        </span>
      </span>
    );
  }

  if (loading) return <PageLoadingState label="Loading users" />;

  if (error) {
    return (
      <PageErrorState
        message={error}
        onRetry={() => void loadAll()}
        backHref="/admin"
        backLabel="Back to dashboard"
      />
    );
  }

  const list = users ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Users Management
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Roles, plans, and B2B tenant assignment. B2C users have no tenant.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            No users found
          </h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Stats</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {list.map((user) => (
                <tr
                  key={user.id}
                  className="bg-white hover:bg-zinc-50/80 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                >
                  <td className="max-w-[220px] px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {user.email}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      Joined{" "}
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.plan === "paid"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      {tenantLabel(user)}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="inline-flex w-fit items-center gap-1"
                        disabled={actionLoading === user.id}
                        onClick={() => openTenantModal(user)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </Button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <div>{user.attemptCount} attempts</div>
                    {user.lastLogin ? (
                      <div>
                        Last active{" "}
                        {new Date(user.lastLogin).toLocaleDateString()}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {user.plan === "free" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={actionLoading === user.id}
                          onClick={() => void handlePlanChange(user, "paid")}
                        >
                          {actionLoading === user.id ? "…" : "Set paid"}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === user.id}
                          onClick={() => void handlePlanChange(user, "free")}
                          className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        >
                          {actionLoading === user.id ? "…" : "Set free"}
                        </Button>
                      )}
                      {user.role === "user" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={actionLoading === user.id}
                          onClick={() => void handleRoleChange(user, "admin")}
                        >
                          {actionLoading === user.id ? "…" : "Make admin"}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === user.id}
                          onClick={() => void handleRoleChange(user, "user")}
                          className="text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                        >
                          {actionLoading === user.id ? "…" : "Remove admin"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!tenantModalUser}
        onClose={closeTenantModal}
        title="Assign tenant"
        subtitle="Link this account to a coaching institute (B2B) or leave on the PrepMaster platform (B2C)."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={tenantSaveLoading}
              onClick={closeTenantModal}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={tenantSaveLoading}
              onClick={() => void handleTenantSave()}
            >
              {tenantSaveLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        }
      >
        {tenantModalUser ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                User
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {tenantModalUser.email}
              </p>
            </div>
            <div>
              <label
                htmlFor="tenant-select"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Organization (tenant)
              </label>
              <select
                id="tenant-select"
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={editTenantId}
                onChange={(e) => setEditTenantId(e.target.value)}
              >
                <option value="">
                  None (B2C / PrepMaster platform)
                </option>
                {tenants
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.domain ? ` — ${t.domain}` : ""}
                      {t.status === "inactive" ? " (inactive)" : ""}
                    </option>
                  ))}
              </select>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Only tenants you have created under Admin → Tenants appear here.
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
