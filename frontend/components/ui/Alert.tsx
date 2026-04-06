export function Alert({
  message,
  variant = "error",
}: {
  message: string;
  variant?: "error" | "info";
}) {
  const styles =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
      : "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100";

  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      {message}
    </div>
  );
}
