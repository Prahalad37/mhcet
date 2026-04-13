"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { useLocale } from "@/components/providers/LocaleProvider";

function RegisterForm() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nextParam = searchParams.get("next");
  const redirectPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string }>("/api/auth/register", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email, password }),
        ...noErrorToast,
      });
      setToken(res.token);
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(t("register.err409"));
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("register.failed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("register.title")}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          {t("register.subtitle")}{" "}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            {t("register.loginLink")}
          </Link>
        </p>
      </div>
      {error ? <Alert message={error} /> : null}
      <form
        onSubmit={onSubmit}
        className="glass-card space-y-4 p-6"
      >
        <Input
          label={t("register.email")}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t("register.passwordMin")}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? t("register.loading") : t("register.signUpFree")}
        </button>
      </form>
    </div>
  );
}

function RegisterSuspenseFallback() {
  const { t } = useLocale();
  return <PageLoadingState label={t("common.loading")} />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterSuspenseFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
