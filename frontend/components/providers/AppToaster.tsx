"use client";

import { Toaster } from "sonner";
import "sonner/dist/styles.css";

/** Client-only; `next.config.mjs` lists `sonner` in `transpilePackages` for App Router. */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{ duration: 6000 }}
    />
  );
}
