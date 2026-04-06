import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-sky-50/80 p-10 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-sky-950/30">
        <p className="text-sm font-medium uppercase tracking-widest text-sky-700 dark:text-sky-300">
          MHCET Law practice
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Mock tests with a timer, instant scoring, and AI explanations.
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Sign in to attempt syllabus-style MCQs. After you submit, open the
          Explain panel on any question for a structured breakdown—correct
          answer, reasoning, legal concept, and a simple example.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm outline-none transition-colors hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 outline-none transition-colors hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Log in
          </Link>
          <Link
            href="/tests"
            className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-sky-700 outline-none transition-colors hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-sky-300 dark:hover:bg-sky-950/40"
          >
            Browse tests
          </Link>
        </div>
      </div>
    </div>
  );
}
