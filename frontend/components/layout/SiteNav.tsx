"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export function SiteNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = getToken();
    setAuthed(!!token);
    
    // Check if user is admin
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [pathname]);

  function logout() {
    clearToken();
    setAuthed(false);
    router.push("/login");
  }

  const navLink =
    "whitespace-nowrap rounded-lg px-3 py-1.5 text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-zinc-300 dark:hover:bg-zinc-900";
  const navLinkAdmin =
    "whitespace-nowrap rounded-lg px-3 py-1.5 text-amber-700 outline-none hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-amber-300 dark:hover:bg-amber-950/30";

  return (
    <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link
          href="/"
          className="shrink-0 rounded-lg text-sm font-semibold tracking-tight text-zinc-900 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-zinc-50"
        >
          MHCET Law Mock
        </Link>
        <nav
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-sm sm:justify-end"
          aria-label="Primary"
        >
          {authed ? (
            <>
              <Link href="/tests" className={navLink}>
                Tests
              </Link>
              <Link href="/practice" className={navLink}>
                Practice
              </Link>
              <Link href="/attempts" className={navLink}>
                History
              </Link>
              {isAdmin && (
                <Link href="/admin" className={navLinkAdmin}>
                  Admin
                </Link>
              )}
              <Button
                variant="secondary"
                className="!shrink-0 !whitespace-nowrap !py-1.5 !text-xs"
                onClick={logout}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm outline-none hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
