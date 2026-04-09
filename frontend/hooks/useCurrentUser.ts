"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/authApi";
import { getToken } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

/**
 * Loads `/api/auth/me` when a token exists (e.g. white-label nav + dashboard).
 * Refetches when the route changes so post-login navigation picks up profile.
 */
export function useCurrentUser() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return { user, loading };
}
