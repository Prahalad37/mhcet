import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "sm";
};

export function Button({
  className = "",
  variant = "primary",
  size = "default",
  disabled,
  type = "button",
  ...rest
}: Props) {
  const styles = {
    primary:
      "bg-sky-600 text-white shadow-sm hover:bg-sky-500 hover:shadow-md active:bg-sky-800 active:shadow-sm active:scale-[0.98] disabled:pointer-events-none disabled:bg-sky-400/80 disabled:text-white/95 disabled:shadow-none disabled:opacity-90 dark:hover:bg-sky-500 dark:active:bg-sky-900",
    secondary:
      "border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-sm hover:border-zinc-300 hover:bg-white hover:shadow-md active:bg-zinc-200 active:scale-[0.98] active:shadow-sm disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:active:bg-zinc-900",
    ghost:
      "bg-transparent text-sky-700 shadow-none hover:bg-sky-50 hover:text-sky-800 active:bg-sky-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 dark:text-sky-300 dark:hover:bg-sky-950/50 dark:hover:text-sky-200 dark:active:bg-sky-950/70",
  }[variant];

  const sizeStyles =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed ${sizeStyles} ${styles} ${className}`}
      {...rest}
    />
  );
}
