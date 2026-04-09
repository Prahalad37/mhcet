"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { clearToken, getToken } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function SiteNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user: currentUser } = useCurrentUser();

  useEffect(() => {
    const token = getToken();
    setAuthed(!!token);
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function logout() {
    clearToken();
    setAuthed(false);
    router.push("/login");
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navLink = (href: string) =>
    `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
      isActive(href)
        ? "nav-active text-indigo-600 dark:text-indigo-400"
        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
    }`;

  const tenantName = currentUser?.tenantName?.trim();
  const brandIsB2B = Boolean(tenantName);
  const brandLabel = brandIsB2B ? tenantName : "PrepMaster";

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/90"
          : "border-transparent bg-white/70 backdrop-blur-md dark:bg-zinc-950/50"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        {/* Logo */}
        <Link
          href={authed ? "/dashboard" : "/"}
          className="flex min-w-0 max-w-[min(100%,20rem)] items-center gap-2 rounded-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:max-w-none"
          title={brandLabel}
        >
          {brandIsB2B ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 shadow-sm">
              <GraduationCap className="h-4 w-4 text-white" aria-hidden />
            </div>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M2 10L7 3L12 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.5 7.5H9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          <span className="min-w-0 truncate text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {brandLabel}
          </span>
        </Link>

        {/* Nav — hidden on mobile (BottomNav handles those screens) */}
        <nav className="hidden md:flex min-w-0 flex-wrap items-center gap-x-1 gap-y-2" aria-label="Primary">
          {authed ? (
            <>
              <Link href="/dashboard" className={navLink("/dashboard")}>Home</Link>
              <Link href="/tests" className={navLink("/tests")}>Tests</Link>
              <Link href="/my-mocks" className={navLink("/my-mocks")}>My Mocks</Link>
              <Link href="/attempts" className={navLink("/attempts")}>History</Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-amber-600 outline-none transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={logout}
                className="ml-1 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm outline-none transition-all hover:border-zinc-300 hover:shadow dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink("/login")}>Log in</Link>
              <Link
                href="/register"
                className="btn-primary ml-1 !py-1.5 !text-xs"
              >
                Sign up free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
