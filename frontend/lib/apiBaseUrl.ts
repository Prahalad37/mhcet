/**
 * Express API origin for client-side fetch. NEXT_PUBLIC_* is inlined at build time.
 * If the env value omits the scheme (common in dashboards), `fetch()` treats it as a
 * same-origin path → 404 on Vercel instead of hitting Railway.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return "http://localhost:4000";
  const noTrailingSlash = raw.replace(/\/$/, "");
  if (/^https?:\/\//i.test(noTrailingSlash)) {
    return noTrailingSlash;
  }
  return `https://${noTrailingSlash}`;
}
