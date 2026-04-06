#!/bin/sh
set -e
# Run migrations before the server unless SKIP_DB_MIGRATE=true (e.g. external CI migrate).
# Railway: prefer this path — pre-deploy hooks may not have DATABASE_URL; the running container does.
if [ "${SKIP_DB_MIGRATE:-}" != "true" ]; then
  node src/db/migrate.js
fi
exec node src/index.js
