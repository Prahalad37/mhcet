"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Library,
  BarChart2,
  User,
  ShieldCheck,
} from "lucide-react";
import { getToken } from "@/lib/auth";

// Routes where the BottomNav must be hidden.
// The exam engine has its OWN sticky bottom bar — overlapping would be disastrous.
const HIDDEN_ROUTES = ["/take", "/login", "/register"];

function shouldHide(pathname: string) {
  return HIDDEN_ROUTES.some((r) => pathname.includes(r));
}

interface Tab {
  href: string;
  label: string;
  icon: React.FC<{ className?: string; "aria-hidden"?: boolean }>;
  /** Only render this tab when the user is an admin */
  adminOnly?: boolean;
  /** Only render when logged in */
  authRequired?: boolean;
  /** Match exactly, not prefix */
  exact?: boolean;
}

const TABS: Tab[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    authRequired: true,
  },
  {
    href: "/tests",
    label: "Tests",
    icon: Library,
    authRequired: true,
  },
  {
    href: "/attempts",
    label: "Results",
    icon: BarChart2,
    authRequired: true,
  },
  {
    href: "/admin",
    label: "Admin",
    icon: ShieldCheck,
    authRequired: true,
    adminOnly: true,
  },
  {
    href: "/login",
    label: "Profile",
    icon: User,
    authRequired: false,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Re-derive auth state on every route change (same pattern as SiteNav)
  useEffect(() => {
    const token = getToken();
    setAuthed(!!token);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setIsAdmin(payload.role === "admin");
      } catch {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [pathname]);

  // Don't render at all on exam / auth pages or desktop (handled via CSS)
  if (shouldHide(pathname)) return null;

  // Decide which tabs to actually render
  const visibleTabs = TABS.filter((tab) => {
    if (tab.adminOnly && !isAdmin) return false;
    if (tab.authRequired && !authed) return false;
    // When logged in, skip the "Profile → /login" tab; show admin tab instead
    if (tab.href === "/login" && authed) return false;
    return true;
  });

  const isActive = (tab: Tab) => {
    if (tab.exact) return pathname === tab.href;
    // Special-case dashboard so it doesn't match everything
    if (tab.href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === tab.href || pathname.startsWith(tab.href + "/");
  };

  return (
    /**
     * md:hidden — completely invisible on tablet/desktop.
     * The top SiteNav handles navigation there.
     *
     * pb-[env(safe-area-inset-bottom)] — pushes content above iPhone
     * swipe-home indicator (Dynamic Island devices need this).
     */
    <nav
      aria-label="Bottom navigation"
      className={[
        // Visibility: mobile only
        "md:hidden",
        // Positioning
        "fixed bottom-0 left-0 right-0 z-50",
        // iOS glass effect — light mode
        "bg-white/85 backdrop-blur-xl",
        // Border
        "border-t border-zinc-200/60",
        // Dark mode glass
        "dark:bg-zinc-950/85 dark:border-white/8",
        // Shadow — subtle elevation above content
        "shadow-[0_-1px_12px_0_rgba(0,0,0,0.06)] dark:shadow-[0_-1px_12px_0_rgba(0,0,0,0.3)]",
      ].join(" ")}
    >
      {/* Safe-area wrapper — this is the element that gets true padding */}
      <div
        className="flex items-stretch justify-around px-1 pt-1.5"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        }}
      >
        {visibleTabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={[
                // Minimum iOS tap target: 44×44 pt
                "flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5",
                "rounded-xl outline-none",
                // Focus ring for accessibility
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                // Touch feedback — native iOS feel
                "transition-all duration-150 active:scale-90 active:opacity-70",
                // Active pill highlight — very subtle like iOS
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-zinc-400 dark:text-zinc-500",
              ].join(" ")}
            >
              {/* Active indicator dot / pill above icon */}
              <span
                className={[
                  "relative flex items-center justify-center rounded-full px-3 py-0.5 transition-all duration-200",
                  active
                    ? "bg-indigo-100/80 dark:bg-indigo-500/15"
                    : "bg-transparent",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "transition-all duration-200",
                    active
                      ? "h-[22px] w-[22px] scale-110"
                      : "h-[20px] w-[20px] scale-100",
                  ].join(" ")}
                  aria-hidden
                />
              </span>

              {/* Label */}
              <span
                className={[
                  "text-[10px] font-semibold leading-none tracking-wide transition-all duration-200",
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-400 dark:text-zinc-500",
                ].join(" ")}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
