"use client";

import { useEffect, useState } from "react";
import { getAuditLogs } from "@/lib/adminApi";
import { getUserErrorMessage } from "@/lib/errorMessages";
import type { AuditLogsResponse } from "@/lib/types";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageErrorState } from "@/components/ui/PageErrorState";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function ActionBadge({ action }: { action: string }) {
  const colors = {
    create: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
    update: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200", 
    delete: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
    import: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  };
  
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[action as keyof typeof colors] || colors.update}`}>
      {action}
    </span>
  );
}

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const auditData = await getAuditLogs({ limit: 50 });
      setData(auditData);
    } catch (e) {
      setError(getUserErrorMessage(e, { fallback: "Could not load audit logs." }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  if (loading) return <PageLoadingState label="Loading audit logs" />;
  
  if (error) {
    return (
      <PageErrorState
        message={error}
        onRetry={loadAuditLogs}
        backHref="/admin"
        backLabel="Back to dashboard"
      />
    );
  }

  const logs = data?.logs || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Audit Logs
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Track all admin actions and changes
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            No audit logs yet
          </h3>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Admin actions will appear here once you start making changes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <ActionBadge action={log.action} />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {log.resourceType}
                    </span>
                    {log.resourceId && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {log.resourceId.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                  
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    by {log.userEmail}
                  </p>
                  
                  {log.newData != null && (
                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {log.action === "create" &&
                        typeof log.newData.title === "string" && (
                        <span>Created: {log.newData.title}</span>
                      )}
                      {log.action === "import" &&
                        typeof log.newData.imported === "number" && (
                        <span>
                          Imported {log.newData.imported} questions to{" "}
                          {typeof log.newData.testTitle === "string"
                            ? log.newData.testTitle
                            : ""}
                        </span>
                      )}
                      {log.action === "update" && log.oldData != null && (
                        <span>
                          Updated fields: {Object.keys(log.newData).join(", ")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDate(log.createdAt)}
                </span>
              </div>
            </div>
          ))}
          
          {data && data.pagination.pages > 1 && (
            <div className="text-center pt-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Page {data.pagination.page} of {data.pagination.pages} 
                ({data.pagination.total} total logs)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}