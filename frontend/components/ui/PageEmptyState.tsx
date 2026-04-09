import Link from "next/link";
import { Button } from "./Button";

type Props = {
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

export function PageEmptyState({ message, actionHref, actionLabel }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200/50 bg-zinc-50/90 p-5 text-sm text-zinc-600 shadow-sm transition-all duration-200 ease-in-out dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:text-zinc-400">
      <p>{message}</p>
      {actionHref && actionLabel ? (
        <div className="mt-3">
          <Link href={actionHref}>
            <Button type="button" variant="secondary">
              {actionLabel}
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
