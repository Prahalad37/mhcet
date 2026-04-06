"use client";

import dynamic from "next/dynamic";

/** SSR off — avoids broken server vendor chunks for `sonner` in Next 14. */
const Toaster = dynamic(
  () =>
    import("sonner").then((mod) => {
      const C = mod.Toaster;
      return { default: C };
    }),
  { ssr: false, loading: () => null }
);

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
