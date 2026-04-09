import { api, noErrorToast } from "./api";
import type { AuthUser } from "./types";

/** Current session user (B2B includes `tenantName` from `tenants`). */
export async function getCurrentUser(): Promise<AuthUser> {
  const res = await api<{ user: AuthUser }>("/api/auth/me", noErrorToast);
  return res.user;
}
