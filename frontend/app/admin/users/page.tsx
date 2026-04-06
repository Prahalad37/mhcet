"use client";

import { useEffect, useState } from "react";
import { getAdminUsers, updateUserPlan, updateUserRole } from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageErrorState } from "@/components/ui/PageErrorState";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not load users." }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handlePlanChange = async (user: AdminUser, newPlan: "free" | "paid") => {
    if (actionLoading || user.plan === newPlan) return;
    const action = newPlan === "paid" ? "paid (unlimited mocks)" : "free (daily cap)";
    if (!confirm(`Set ${user.email} to ${action}?`)) return;
    setActionLoading(user.id);
    try {
      const updated = await updateUserPlan(user.id, newPlan);
      setUsers((prev) => prev?.map((u) => (u.id === user.id ? updated : u)) || null);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not update plan." }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (user: AdminUser, newRole: 'user' | 'admin') => {
    if (actionLoading || user.role === newRole) return;
    
    const action = newRole === 'admin' ? 'promote' : 'demote';
    if (!confirm(`${action === 'promote' ? 'Promote' : 'Demote'} ${user.email} ${action === 'promote' ? 'to admin' : 'to regular user'}?`)) {
      return;
    }
    
    setActionLoading(user.id);
    try {
      const updated = await updateUserRole(user.id, newRole);
      setUsers(prev => prev?.map(u => u.id === user.id ? updated : u) || null);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: `Could not ${action} user.` }));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <PageLoadingState label="Loading users" />;
  
  if (error) {
    return (
      <PageErrorState
        message={error}
        onRetry={loadUsers}
        backHref="/admin"
        backLabel="Back to dashboard"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Users Management
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage user roles and view user statistics
        </p>
      </div>

      {users && users.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            No users found
          </h3>
        </div>
      ) : null}

      {users && users.length > 0 ? (
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {user.email}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      user.role === 'admin'
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {user.role}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      user.plan === "paid"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {user.plan === "paid" ? "paid" : "free"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{user.attemptCount} attempts</span>
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  {user.lastLogin && (
                    <span>Last active {new Date(user.lastLogin).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                {user.plan === "free" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={actionLoading === user.id}
                    onClick={() => void handlePlanChange(user, "paid")}
                  >
                    {actionLoading === user.id ? "..." : "Set paid"}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={actionLoading === user.id}
                    onClick={() => void handlePlanChange(user, "free")}
                    className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  >
                    {actionLoading === user.id ? "..." : "Set free"}
                  </Button>
                )}
                {user.role === 'user' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={actionLoading === user.id}
                    onClick={() => handleRoleChange(user, 'admin')}
                  >
                    {actionLoading === user.id ? "..." : "Make Admin"}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={actionLoading === user.id}
                    onClick={() => handleRoleChange(user, 'user')}
                    className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  >
                    {actionLoading === user.id ? "..." : "Remove Admin"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}