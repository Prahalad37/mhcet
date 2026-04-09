import { getApiBaseUrl } from "./apiBaseUrl";
import { getToken } from "./auth";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export type JobPollStatus = "queued" | "active" | "completed" | "failed";

export type JobStatusBody<T = unknown> = {
  jobId: string;
  kind: string;
  status: JobPollStatus;
  result?: T;
  error?: string;
};

/**
 * Poll `GET /api/jobs/:jobId` until completed or failed (server-authoritative jobs).
 */
export async function pollJob<T>(
  jobId: string,
  options?: { intervalMs?: number; maxWaitMs?: number }
): Promise<T> {
  const base = getApiBaseUrl();
  const token = getToken();
  const intervalMs = options?.intervalMs ?? 650;
  const maxWaitMs = options?.maxWaitMs ?? 15 * 60_000;
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const res = await fetch(`${base}/api/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });
    const data = (await res.json()) as JobStatusBody<T> & { error?: string };

    if (!res.ok) {
      const msg =
        typeof data?.error === "string" && data.error
          ? data.error
          : `Job status failed (${res.status})`;
      throw new Error(msg);
    }

    if (data.status === "completed") {
      return data.result as T;
    }
    if (data.status === "failed") {
      throw new Error(data.error || "Job failed");
    }

    await sleep(intervalMs);
  }

  throw new Error("Job timed out — try again or check that the API worker is running.");
}
