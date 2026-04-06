import Link from "next/link";
import { Alert } from "./Alert";
import { Button } from "./Button";

type Props = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  backHref?: string;
  backLabel?: string;
};

export function PageErrorState({
  message,
  onRetry,
  retryLabel = "Retry",
  backHref,
  backLabel = "Back",
}: Props) {
  return (
    <div className="space-y-4">
      <Alert message={message} />
      <div className="flex flex-wrap gap-2">
        {onRetry ? (
          <Button type="button" variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        {backHref ? (
          <Link href={backHref}>
            <Button type="button" variant="ghost">
              {backLabel}
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
