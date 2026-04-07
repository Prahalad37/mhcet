"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminTest, updateTest } from "@/lib/myMocksApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminTest } from "@/lib/types";
import { ADMIN_TOPIC_OPTIONS } from "@/lib/adminTopicOptions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageErrorState } from "@/components/ui/PageErrorState";

export default function EditTestPage() {
  const params = useParams<{ id: string }>();
  const testId = params.id;
  const router = useRouter();

  const [test, setTest] = useState<AdminTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    durationSeconds: 7200,
    topic: "",
    isActive: true,
  });

  const topicSelectOptions = useMemo(() => {
    const set = new Set<string>(ADMIN_TOPIC_OPTIONS);
    if (formData.topic && !set.has(formData.topic)) {
      return [formData.topic, ...ADMIN_TOPIC_OPTIONS];
    }
    return [...ADMIN_TOPIC_OPTIONS];
  }, [formData.topic]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await getAdminTest(testId);
      setTest(t);
      setFormData({
        title: t.title,
        description: t.description ?? "",
        durationSeconds: t.durationSeconds,
        topic: t.topic,
        isActive: t.isActive,
      });
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not load test." }));
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateTest(testId, {
        title: formData.title,
        description: formData.description || undefined,
        durationSeconds: formData.durationSeconds,
        topic: formData.topic,
        isActive: formData.isActive,
      });
      router.push("/my-mocks");
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not save test." }));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoadingState label="Loading test" />;

  if (error && !test) {
    return (
      <PageErrorState
        message={error}
        onRetry={load}
        backHref="/my-mocks"
        backLabel="Back to tests"
      />
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/my-mocks"
          className="text-sm text-sky-600 hover:underline dark:text-sky-400"
        >
          ← Tests
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600">/</span>
        <Link
          href={`/my-mocks/${testId}/questions`}
          className="text-sm text-sky-600 hover:underline dark:text-sky-400"
        >
          Questions
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Edit test
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Update metadata. If students already submitted attempts, changing duration
          or content may confuse historical results—prefer deactivating old tests.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Test title *
              </label>
              <Input
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
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
                  value={Math.round(formData.durationSeconds / 60)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
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
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, topic: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {topicSelectOptions.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActiveEdit"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
              />
              <label
                htmlFor="isActiveEdit"
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                Test is active (visible on /tests)
              </label>
            </div>
          </div>
        </div>

        {error && test ? <Alert message={error} /> : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/my-mocks")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
