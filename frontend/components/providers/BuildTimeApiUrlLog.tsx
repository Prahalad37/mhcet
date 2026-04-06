"use client";

import { useEffect } from "react";

/**
 * Logs the API origin baked in at build time (NEXT_PUBLIC_*).
 * Open DevTools → Console after deploy to verify the value matches production.
 */
export function BuildTimeApiUrlLog() {
  useEffect(() => {
    console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
  }, []);
  return null;
}
