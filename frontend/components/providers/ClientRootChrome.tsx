"use client";

import { AppToaster } from "@/components/providers/AppToaster";
import { BuildTimeApiUrlLog } from "@/components/providers/BuildTimeApiUrlLog";

/** Single client boundary for toast + dev-only helpers — avoids `next/dynamic` in the root layout (stale webpack chunk IDs like `./948.js`). */
export function ClientRootChrome({ showDevApiLog }: { showDevApiLog: boolean }) {
  return (
    <>
      {showDevApiLog ? <BuildTimeApiUrlLog /> : null}
      <AppToaster />
    </>
  );
}
