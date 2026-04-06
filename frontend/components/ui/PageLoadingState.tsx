import { Spinner } from "./Spinner";

type Props = {
  label?: string;
  /** Tighter vertical padding (e.g. inline in a split layout) */
  compact?: boolean;
};

export function PageLoadingState({ label = "Loading", compact }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${compact ? "py-8" : "py-16"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner />
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}
