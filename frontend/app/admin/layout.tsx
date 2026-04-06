"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { redirectToLogin } from "@/lib/authRedirect";
import { useClientMounted } from "@/lib/useClientMounted";
import { PageLoadingState } from "@/components/ui/PageLoadingState";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/tests", label: "Tests", icon: "📝" },
  { href: "/admin/import", label: "Import", icon: "📤" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/audit", label: "Audit Logs", icon: "📋" },
];

function AdminSidebar() {
  const pathname = usePathname();
  
  return (
    <nav className="w-64 shrink-0 border-r border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Admin Panel
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Content management
        </p>
      </div>
      
      <ul className="space-y-1">
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href));
          
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      
      <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/tests"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <span className="text-base">←</span>
          Back to app
        </Link>
      </div>
    </nav>
  );
}

type AdminGate = "checking" | "redirect-login" | "denied" | "allowed";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useClientMounted();
  const [gate, setGate] = useState<AdminGate>("checking");

  useEffect(() => {
    if (!mounted) return;

    const token = getToken();
    if (!token) {
      redirectToLogin(router, { next: pathname });
      setGate("redirect-login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role === "admin") {
        setGate("allowed");
      } else {
        setGate("denied");
      }
    } catch {
      redirectToLogin(router, { next: pathname });
      setGate("redirect-login");
    }
  }, [mounted, pathname, router]);

  if (!mounted) {
    return <PageLoadingState label="Loading" />;
  }

  if (gate === "checking") {
    return <PageLoadingState label="Checking permissions" />;
  }

  if (gate === "redirect-login") {
    return (
      <PageLoadingState label="Redirecting to sign in…" />
    );
  }

  if (gate === "denied") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Access Denied
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            You need admin privileges to access this area.
          </p>
          <Link
            href="/tests"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Back to app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950">
      <AdminSidebar />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}