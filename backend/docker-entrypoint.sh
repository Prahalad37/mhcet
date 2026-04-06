#!/bin/sh
set -e
# Local / Docker Compose: run migrations before the server (default).
# Railway (or any host with a separate pre-deploy / release step): set SKIP_DB_MIGRATE=true
# and run `npm run migrate` once per deploy there — avoids N replicas each running migrate on boot.
if [ "${SKIP_DB_MIGRATE:-}" != "true" ]; then
  node src/db/migrate.js
fi
exec node src/index.js
