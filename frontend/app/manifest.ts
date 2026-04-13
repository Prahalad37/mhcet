import type { MetadataRoute } from "next";

/**
 * Web app manifest (installable PWA shell — no Service Worker in this repo).
 * Icons live in /public/icons (PNG from scripts or sharp one-off).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PrepMaster — MHCET Law mocks",
    short_name: "PrepMaster",
    description:
      "MHCET Law (5-Year LLB) timed mocks, section-wise palette, and results.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0ea5e9",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
