/**
 * Never statically import `sonner` in modules shared with the server — it can break
 * Next.js vendor chunks (`Cannot find module './vendor-chunks/sonner.js'`).
 * Dynamic import loads only in the browser when showing a toast.
 */
export function toastErrorSafe(message: string) {
  if (typeof window === "undefined") return;
  const text = message.trim() || "Server unavailable";
  void import("sonner").then(({ toast }) => toast.error(text));
}
