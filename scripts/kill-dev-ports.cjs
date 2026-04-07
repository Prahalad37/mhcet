"use strict";

/**
 * Free common dev ports before `npm run dev` (stale API / Next processes).
 * Set SKIP_DEV_PORTS_KILL=1 to skip (e.g. another project uses these ports).
 */
if (process.env.SKIP_DEV_PORTS_KILL === "1") {
  process.exit(0);
}

const kill = require("kill-port");

const ports = [4000, 3000, 3001, 3002, 3003];

Promise.all(ports.map((p) => kill(p).catch(() => {}))).then(() => process.exit(0));
