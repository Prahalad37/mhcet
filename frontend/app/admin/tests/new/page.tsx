"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTest, getTenants } from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminTenant } from "@/lib/types";
import { toastErrorSafe, toastSuccessSafe } from "@/lib/sonnerToast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ADMIN_TOPIC_OPTIONS } from "@/lib/adminTopicOptions";
import { TestTenantSelect } from "@/components/admin/TestTenantSelect";

export default function NewTestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    durationSeconds: 7200, // 2 hours default
    topic: "",
    isActive: true,
    tenantId: "" as string,
  });
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTenantsLoading(true);
      try {
        const data = await getTenants();
        if (!cancelled) setTenants(data);
      } catch {
        if (!cancelled) {
          setTenants([]);
          toastErrorSafe("Could not load tenants.");
        }
      } finally {
        if (!cancelled) setTenantsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    setCreating(true);
    setError(null);

    try {
      const tenantPayload =
        formData.tenantId === "" ? null : formData.tenantId;
      const test = await createTest({
        title: formData.title,
        description: formData.description || undefined,
        durationSeconds: formData.durationSeconds,
        topic: formData.topic,
        isActive: formData.isActive,
        tenantId: tenantPayload,
      });

      toastSuccessSafe("Test created");
      router.push(`/admin/tests/${test.id}/questions`);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not create test." }));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create Test
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Add a new mock test to the platform
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Test Title *
              </label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., UPSC Prelims Practice Test 1"
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the test content and format"
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
                  value={Math.round(formData.durationSeconds / 60)}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    durationSeconds: parseInt(e.target.value, 10) * 60 
                  }))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Topic *
                </label>
                <select
                  required
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select topic...</option>
                  {ADMIN_TOPIC_OPTIONS.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <TestTenantSelect
              id="new-test-tenant"
              value={formData.tenantId}
              onChange={(tenantId) =>
                setFormData((prev) => ({ ...prev, tenantId }))
              }
              tenants={tenants}
              loading={tenantsLoading}
              disabled={creating}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">
                Make test active (visible to students)
              </label>
            </div>
          </div>
        </div>

        {error && <Alert message={error} />}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={creating || !formData.title || !formData.topic}
          >
            {creating ? "Creating..." : "Create Test"}
          </Button>
        </div>
      </form>
    </div>
  );
}