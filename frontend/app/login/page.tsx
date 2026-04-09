"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, noErrorToast } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PageLoadingState } from "@/components/ui/PageLoadingState";

function LoginForm() {
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
      const res = await api<{ token: string }>("/api/auth/login", {
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
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            Sign up free
          </Link>
        </p>
      </div>
      {error ? <Alert message={error} /> : null}
      <form
        onSubmit={onSubmit}
        className="glass-card space-y-4 p-6"
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full !py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : "Continue →"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoadingState label="Loading" />}>
      <LoginForm />
    </Suspense>
  );
}
