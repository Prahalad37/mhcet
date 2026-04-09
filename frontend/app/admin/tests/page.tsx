"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import {
  getAdminTests,
  getTenants,
  createTest,
  updateTest,
  deleteTest,
  toggleTestActive,
} from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminTenant, AdminTest } from "@/lib/types";
import { ADMIN_TOPIC_OPTIONS } from "@/lib/adminTopicOptions";
import { toastErrorSafe, toastSuccessSafe } from "@/lib/sonnerToast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageErrorState } from "@/components/ui/PageErrorState";
import { TestTenantSelect } from "@/components/admin/TestTenantSelect";

const emptyForm = () => ({
  title: "",
  description: "",
  durationSeconds: 7200,
  topic: "",
  isActive: true,
  tenantId: "" as string,
});

type TestForm = ReturnType<typeof emptyForm>;

function testTenantChip(test: AdminTest) {
  if (!test.tenantId) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        B2C · PrepMaster
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100">
      <Building2 className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate" title={test.tenantName || test.tenantId}>
        {test.tenantName || "B2B (unnamed)"}
      </span>
    </span>
  );
}

export default function AdminTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<AdminTest[] | null>(null);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TestForm>(() => emptyForm());
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editTest, setEditTest] = useState<AdminTest | null>(null);
  const [editForm, setEditForm] = useState<TestForm>(() => emptyForm());
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminTests();
      setTests(data);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not load tests." }));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch {
      setTenants([]);
      toastErrorSafe("Could not load tenants for assignment.");
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTests();
  }, [loadTests]);

  useEffect(() => {
    if (createOpen || editTest) {
      void loadTenants();
    }
  }, [createOpen, editTest, loadTenants]);

  const openCreate = () => {
    setCreateForm(emptyForm());
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (createSubmitting) return;
    setCreateOpen(false);
  };

  const openEdit = (test: AdminTest) => {
    setEditTest(test);
    setEditForm({
      title: test.title,
      description: test.description ?? "",
      durationSeconds: test.durationSeconds,
      topic: test.topic,
      isActive: test.isActive,
      tenantId: test.tenantId ?? "",
    });
  };

  const closeEdit = () => {
    if (editSubmitting) return;
    setEditTest(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createSubmitting) return;
    setCreateSubmitting(true);
    try {
      const tenantPayload =
        createForm.tenantId === "" ? null : createForm.tenantId;
      const test = await createTest({
        title: createForm.title,
        description: createForm.description || undefined,
        durationSeconds: createForm.durationSeconds,
        topic: createForm.topic,
        isActive: createForm.isActive,
        tenantId: tenantPayload,
      });
      toastSuccessSafe("Test created");
      setCreateOpen(false);
      setTests((prev) => (prev ? [test, ...prev] : [test]));
      router.push(`/admin/tests/${test.id}/questions`);
    } catch (err) {
      toastErrorSafe(
        getUserErrorMessage(err, { fallback: "Could not create test." })
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTest || editSubmitting) return;
    setEditSubmitting(true);
    try {
      const tenantPayload =
        editForm.tenantId === "" ? null : editForm.tenantId;
      const updated = await updateTest(editTest.id, {
        title: editForm.title,
        description: editForm.description || undefined,
        durationSeconds: editForm.durationSeconds,
        topic: editForm.topic,
        isActive: editForm.isActive,
        tenantId: tenantPayload,
      });
      toastSuccessSafe("Test updated");
      setTests((prev) =>
        prev?.map((t) => (t.id === updated.id ? updated : t)) ?? null
      );
      closeEdit();
    } catch (err) {
      toastErrorSafe(
        getUserErrorMessage(err, { fallback: "Could not save test." })
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleActive = async (test: AdminTest) => {
    if (actionLoading) return;
    setActionLoading(test.id);
    try {
      const updated = await toggleTestActive(test.id);
      setTests((prev) =>
        prev?.map((t) => (t.id === test.id ? updated : t)) ?? null
      );
      toastSuccessSafe(
        updated.isActive ? "Test activated" : "Test deactivated"
      );
    } catch (e) {
      toastErrorSafe(
        getUserErrorMessage(e, { fallback: "Could not update test status." })
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (test: AdminTest) => {
    if (actionLoading) return;
    if (
      !confirm(
        `Delete "${test.title}"? This action cannot be undone if the test has no attempts.`
      )
    ) {
      return;
    }

    setActionLoading(test.id);
    try {
      await deleteTest(test.id);
      setTests((prev) => prev?.filter((t) => t.id !== test.id) ?? null);
      toastSuccessSafe("Test removed");
    } catch (e) {
      toastErrorSafe(
        getUserErrorMessage(e, { fallback: "Could not delete test." })
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <PageLoadingState label="Loading tests" />;

  if (error) {
    return (
      <PageErrorState
        message={error}
        onRetry={loadTests}
        backHref="/admin"
        backLabel="Back to dashboard"
      />
    );
  }

  const list = tests ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tests Management
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Create, edit, and assign mocks to B2B institutes or the global B2C
            catalog.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Create Test
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            No tests yet
          </h3>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Create your first test to get started.
          </p>
          <Button type="button" className="mt-4" onClick={openCreate}>
            Create Test
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                <th className="px-4 py-3">Test</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {list.map((test) => (
                <tr
                  key={test.id}
                  className="bg-white hover:bg-zinc-50/80 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                >
                  <td className="max-w-[280px] px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {test.title}
                    </div>
                    {test.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {test.description}
                      </p>
                    ) : null}
                    <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                      Created {new Date(test.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">{testTenantChip(test)}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        test.isActive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {test.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                    <div>{test.questionCount} questions</div>
                    <div>{Math.ceil(test.durationSeconds / 60)} min</div>
                    <div className="max-w-[180px] truncate" title={test.topic}>
                      {test.topic}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link href={`/admin/tests/${test.id}/questions`}>
                        <Button variant="secondary" size="sm">
                          Questions ({test.questionCount})
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(test)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={actionLoading === test.id}
                        onClick={() => handleToggleActive(test)}
                      >
                        {actionLoading === test.id
                          ? "…"
                          : test.isActive
                            ? "Deactivate"
                            : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoading === test.id}
                        onClick={() => handleDelete(test)}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      >
                        {actionLoading === test.id ? "…" : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Create test"
        subtitle="Assign to an institute (B2B) or leave global for the PrepMaster catalog."
        wide
        bodyClassName="space-y-4"
      >
        <form id="admin-create-test-form" onSubmit={handleCreateSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Test title *
              </label>
              <Input
                required
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, title: e.target.value }))
                }
                className="mt-1"
                placeholder="e.g., MHCET Law Mock 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Duration (minutes) *
                </label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={Math.round(createForm.durationSeconds / 60)}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      durationSeconds: parseInt(e.target.value, 10) * 60,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Topic *
                </label>
                <select
                  required
                  value={createForm.topic}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, topic: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select topic…</option>
                  {ADMIN_TOPIC_OPTIONS.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <TestTenantSelect
              id="create-test-tenant"
              value={createForm.tenantId}
              onChange={(tenantId) =>
                setCreateForm((p) => ({ ...p, tenantId }))
              }
              tenants={tenants}
              loading={tenantsLoading}
              disabled={createSubmitting}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-is-active"
                checked={createForm.isActive}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, isActive: e.target.checked }))
                }
                className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
              />
              <label
                htmlFor="create-is-active"
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                Active (visible to eligible students)
              </label>
            </div>
          </div>
        </form>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <Button
            type="button"
            variant="secondary"
            onClick={closeCreate}
            disabled={createSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="admin-create-test-form"
            disabled={
              createSubmitting ||
              !createForm.title.trim() ||
              !createForm.topic
            }
          >
            {createSubmitting ? "Creating…" : "Create & add questions"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!editTest}
        onClose={closeEdit}
        title="Edit test"
        subtitle="Change metadata or move between global catalog and a B2B institute."
        wide
        bodyClassName="space-y-4"
      >
        {editTest ? (
          <>
            <form id="admin-edit-test-form" onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Test title *
                  </label>
                  <Input
                    required
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Duration (minutes) *
                    </label>
                    <Input
                      type="number"
                      required
                      min={1}
                      value={Math.round(editForm.durationSeconds / 60)}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          durationSeconds: parseInt(e.target.value, 10) * 60,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Topic *
                    </label>
                    <select
                      required
                      value={editForm.topic}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, topic: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      {[
                        ...new Set([
                          editForm.topic,
                          ...ADMIN_TOPIC_OPTIONS,
                        ]),
                      ].map((topic) => (
                        <option key={topic} value={topic}>
                          {topic}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <TestTenantSelect
                  id="edit-test-tenant"
                  value={editForm.tenantId}
                  onChange={(tenantId) =>
                    setEditForm((p) => ({ ...p, tenantId }))
                  }
                  tenants={tenants}
                  loading={tenantsLoading}
                  disabled={editSubmitting}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-is-active"
                    checked={editForm.isActive}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, isActive: e.target.checked }))
                    }
                    className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                  <label
                    htmlFor="edit-is-active"
                    className="text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    Test is active
                  </label>
                </div>
              </div>
            </form>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                onClick={closeEdit}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" form="admin-edit-test-form" disabled={editSubmitting}>
                {editSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
