/** Canonical site origin for metadata (Open Graph, etc.). Set in production (e.g. Vercel). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  const noTrailingSlash = raw.replace(/\/$/, "");
  // `new URL()` in metadata requires an absolute URL; env often omits the scheme.
  if (/^https?:\/\//i.test(noTrailingSlash)) {
    return noTrailingSlash;
  }
  return `https://${noTrailingSlash}`;
}
