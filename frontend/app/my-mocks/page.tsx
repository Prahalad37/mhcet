"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminTests, deleteTest, updateTest } from "@/lib/myMocksApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AdminTest } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageErrorState } from "@/components/ui/PageErrorState";

export default function AdminTestsPage() {
  const [tests, setTests] = useState<AdminTest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTests = async () => {
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
  };

  useEffect(() => {
    loadTests();
  }, []);

  const handleToggleActive = async (test: AdminTest) => {
    if (actionLoading) return;
    setActionLoading(test.id);
    try {
      await updateTest(test.id, { isActive: !test.isActive });
      setTests(prev => prev?.map(t => t.id === test.id ? { ...t, isActive: !t.isActive } : t) || null);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not update test status." }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (test: AdminTest) => {
    if (actionLoading) return;
    if (!confirm(`Delete "${test.title}"? This action cannot be undone if the test has no attempts.`)) {
      return;
    }
    
    setActionLoading(test.id);
    try {
      await deleteTest(test.id);
      setTests(prev => prev?.filter(t => t.id !== test.id) || null);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not delete test." }));
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
        backHref="/my-mocks"
        backLabel="Back to My Mocks"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            My Mocks
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Create and manage your private mock tests
          </p>
        </div>
        <Link href="/my-mocks/new">
          <Button>Create Test</Button>
        </Link>
      </div>

      {tests && tests.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            No tests yet
          </h3>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Create your first test to get started.
          </p>
          <Link href="/my-mocks/new" className="mt-4 inline-block">
            <Button>Create Test</Button>
          </Link>
        </div>
      ) : null}

      {tests && tests.length > 0 ? (
        <div className="space-y-4">
          {tests.map((test) => (
            <div
              key={test.id}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {test.title}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      test.isActive
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {test.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {test.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{test.questionCount} questions</span>
                  <span>{Math.ceil(test.durationSeconds / 60)} minutes</span>
                  <span>{test.topic}</span>
                  {test.createdAt && !isNaN(new Date(test.createdAt).getTime()) ? (
                    <span>Created {new Date(test.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  ) : null}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Link href={`/my-mocks/${test.id}/questions`}>
                  <Button variant="secondary" size="sm">
                    Questions ({test.questionCount})
                  </Button>
                </Link>
                <Link href={`/my-mocks/${test.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={actionLoading === test.id}
                  onClick={() => handleToggleActive(test)}
                >
                  {actionLoading === test.id ? "..." : test.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={actionLoading === test.id}
                  onClick={() => handleDelete(test)}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  {actionLoading === test.id ? "..." : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}