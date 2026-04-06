import { getToken } from "./auth";
import { toastErrorSafe } from "./sonnerToast";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

/** Cold start / proxy blips (e.g. Railway): extra attempts before surfacing failure. */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 400;
/** Avoid indefinite hangs when the API host is wrong or the connection stalls. */
const FETCH_TIMEOUT_MS = 45_000;

/** Pass into `api()` when the caller already shows inline/page error (avoids duplicate toasts). */
export const noErrorToast = { showErrorToast: false as const };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
  /** When true (default in the browser), failed responses show a toast before throwing. Set false if the caller handles errors in UI. */
  showErrorToast?: boolean;
};

function extractErrorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    if (typeof o.error === "string") {
      let msg = o.error;
      if (o.details && typeof o.details === "object") {
        const flat = o.details as Record<string, string[] | undefined>;
        const first = Object.values(flat).find((v) => Array.isArray(v) && v[0]);
        if (first?.[0]) msg = `${msg}: ${first[0]}`;
      }
      return msg;
    }
  }
  return `Request failed (${status})`;
}

function shouldToast(options: FetchOptions) {
  if (options.showErrorToast === false) return false;
  return typeof window !== "undefined";
}

function emitErrorToast(message: string, options: FetchOptions) {
  if (!shouldToast(options)) return;
  const text = (message || "").trim() || "Server unavailable";
  toastErrorSafe(text);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function mergeSignals(
  callerSignal?: AbortSignal | null,
  timeoutSignal?: AbortSignal
): AbortSignal | undefined {
  if (callerSignal == null) return timeoutSignal;
  if (!timeoutSignal) return callerSignal;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any([callerSignal, timeoutSignal]);
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (callerSignal.aborted || timeoutSignal.aborted) {
    abort();
    return controller.signal;
  }
  callerSignal.addEventListener("abort", abort, { once: true });
  timeoutSignal.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

/** Gateway / upstream unavailable — common while a slept host wakes. */
function isTransientHttpStatus(status: number) {
  return status === 502 || status === 503 || status === 504;
}

function shouldRetryNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  if (e instanceof Error && e.name === "AbortError") return false;
  return true;
}

function throwNetworkFailure(e: unknown, options: FetchOptions): never {
  const errorMessage = e instanceof Error ? e.message.toLowerCase() : "";

  if (errorMessage.includes("failed to fetch") || errorMessage.includes("network error")) {
    const msg =
      "Unable to connect to the server. Please check your internet connection and try again.";
    emitErrorToast(msg, options);
    throw new ApiError(0, msg, e);
  }

  if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
    const msg =
      "Request timed out. Please check your connection and try again.";
    emitErrorToast(msg, options);
    throw new ApiError(0, msg, e);
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const msg =
      "You appear to be offline. Please check your internet connection.";
    emitErrorToast(msg, options);
    throw new ApiError(0, msg, e);
  }

  const hint = e instanceof Error ? e.message : "Network error";
  const msg = `Cannot reach the API at ${baseUrl}. Start the backend (cd backend && npm run dev), set NEXT_PUBLIC_API_URL in frontend/.env.local, and use the same host for the app and CORS (localhost vs 127.0.0.1). (${hint})`;
  emitErrorToast("Server unavailable", options);
  throw new ApiError(0, msg, e);
}

export async function api<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type") && rest.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${baseUrl}${path}`;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * attempt);
    }

    let res: Response;
    const timeoutSignal =
      typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? AbortSignal.timeout(FETCH_TIMEOUT_MS)
        : undefined;
    const mergedSignal = mergeSignals(rest.signal, timeoutSignal);

    try {
      res = await fetch(url, { ...rest, headers, signal: mergedSignal });
    } catch (e) {
      if (
        attempt < MAX_ATTEMPTS - 1 &&
        shouldRetryNetworkError(e)
      ) {
        continue;
      }
      throwNetworkFailure(e, options);
    }

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      if (
        attempt < MAX_ATTEMPTS - 1 &&
        isTransientHttpStatus(res.status)
      ) {
        continue;
      }
      const msg = extractErrorMessage(data, res.status);
      emitErrorToast(msg, options);
      throw new ApiError(res.status, msg, data);
    }

    return data as T;
  }

  throw new ApiError(0, "Server unavailable");
}
