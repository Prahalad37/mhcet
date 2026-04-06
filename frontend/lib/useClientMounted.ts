import { useEffect, useState } from "react";

/** True only after mount — avoids hydration mismatch when using sessionStorage / getToken() in render. */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
