import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-zinc-200/80 bg-white/60 py-8 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          © {year} MHCET Law Mock — practice tests for exam preparation.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link
            href="/tests"
            className="text-sky-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-sky-400"
          >
            Browse tests
          </Link>
          <Link
            href="/login"
            className="text-sky-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-sky-400"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sky-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-sky-400"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}
