import { createApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";

const port = Number(process.env.PORT) || 4000;

// Run DB migrations first, then start the HTTP server.
// One process — no shell && chains that can silently fail.
runMigrations()
  .then(() => {
    const app = createApp();
    app.listen(port, () => {
      console.log(
        JSON.stringify({
          level: "info",
          msg: "server_listen",
          ts: new Date().toISOString(),
          port,
          nodeEnv: process.env.NODE_ENV || "development",
        })
      );
    });
  })
  .catch((err) => {
    console.error("Fatal: migration failed, refusing to start server.", err);
    process.exit(1);
  });
