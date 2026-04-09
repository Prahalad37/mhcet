"use client";

import type { AdminTenant } from "@/lib/types";

type Props = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  tenants: AdminTenant[];
  disabled?: boolean;
  loading?: boolean;
};

/**
 * Native select: global platform catalog vs B2B institute.
 * Empty string → backend `null` / global (send `null` or `""` from caller).
 */
export function TestTenantSelect({
  id = "test-tenant-select",
  label = "Select Tenant",
  value,
  onChange,
  tenants,
  disabled,
  loading,
}: Props) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="mt-1 block w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-inner transition-all duration-200 ease-in-out hover:border-zinc-300 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/90 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
      >
        <option value="">None (Global B2C / PrepMaster)</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.status === "inactive" ? " (inactive)" : ""}
          </option>
        ))}
      </select>
      {loading ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Loading organizations…
        </p>
      ) : null}
    </div>
  );
}
