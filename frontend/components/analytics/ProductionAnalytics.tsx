import { GoogleAnalytics } from "@next/third-parties/google";
import { MetaPixel } from "./MetaPixel";

/**
 * GA4 + Meta Pixel — only mounted in production when env IDs are present.
 * Keeps dev bundles free of third-party scripts.
 */
export function ProductionAnalytics() {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  return (
    <>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      <MetaPixel />
    </>
  );
}
