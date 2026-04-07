# MHCET Law Mock Test

Production-oriented mock exam app: **Next.js** frontend, **Express** API, **PostgreSQL**, **JWT** auth, timed MCQ attempts, scored results, and **OpenAI**-powered explanations (`POST /api/explain`).

## Prerequisites

- Node.js 20+
- Docker (optional, for PostgreSQL) or a hosted Postgres instance

## Database

Start PostgreSQL only (default `docker-compose.yml`):

```bash
docker compose up -d
```

Set `DATABASE_URL` in `backend/.env` (see `backend/.env.example`). Default for the compose file above:

`postgresql://postgres:postgres@localhost:5432/mhcet`

### Full stack in Docker (API + DB + Next.js)

Builds the API image (runs migrations on startup), Postgres, and a production Next.js **standalone** bundle:

```bash
docker compose --profile stack up -d --build
```

- API: `http://localhost:4000` — set `JWT_SECRET` (and optionally `CORS_ORIGIN`, `API_NODE_ENV`) via env or `.env` next to compose.
- Web: `http://localhost:3000` — override build arg `NEXT_PUBLIC_API_URL` if the browser must call a different API origin.

For local dev you usually keep **only Postgres** in Docker. Install deps once per package, then start both from the repo root:

```bash
(cd backend && npm install) && (cd frontend && npm install) && npm install && npm run dev
```

- **Root** `npm install` pulls `concurrently` + `cross-env` only; **backend** / **frontend** still use their own `node_modules`.
- **`npm run dev`** first frees **4000** and **3000–3003** (stale `node` / old Next) via [`scripts/kill-dev-ports.cjs`](scripts/kill-dev-ports.cjs), then starts API on **:4000** and Next on **:3000**. Set **`SKIP_DEV_PORTS_KILL=1`** if another app legitimately uses those ports.
- If you hit **`EMFILE` / “too many open files”** on macOS, use **`npm run dev:web:poll`** (or `WATCHPACK_POLLING=1` for the frontend only). [`frontend/next.config.mjs`](frontend/next.config.mjs) ignores **`.next`** in watch options so **polling mode** does not infinite-rebuild.
- If Next still picks **3001+** (all lower ports busy), the API allows **`http://localhost:3000–3999`** in **development** CORS so login works.
- If dev shows **`Unexpected end of JSON input`** in `loadManifest` / **`getNextFontManifest`**, or endless Fast Refresh / **`hot-update.json` 404**, stop all **`next dev`** processes, then run **`npm run dev:fresh`** (deletes **`frontend/.next`** and starts again) or manually: **`npm run clean:next`** then **`npm run dev`**. Keep a **single** Next dev server on a port.

Or run `npm run dev` in `backend/` and `frontend/` separately. From root: `npm run dev:api` / `npm run dev:web` for one side only.

## Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set JWT_SECRET, DATABASE_URL, OPENAI_API_KEY (optional for explanations)

npm install
npm run migrate
npm run seed
# To replace bundled mocks after DB already has tests: npm run seed:reset
npm run dev
```

API listens on `http://localhost:4000` (or `PORT`). Health check: `GET /health`.

### Single admin only (delete all other users)

**Destructive:** removes **every** row in `users` (related data cascades), then inserts **exactly one** account: `role = admin`, `plan = paid`.

```bash
cd backend
npm run reset-admin-users
```

Defaults are in [`backend/scripts/resetAdminUsers.js`](backend/scripts/resetAdminUsers.js). Override without editing the file:

`SINGLE_ADMIN_EMAIL` · `SINGLE_ADMIN_PASSWORD`

Use the **same** `DATABASE_URL` as the DB you mean (local `.env` vs Railway env). After running on **production**, log in once and **change the password**.

**Railway from your laptop:** URLs with host `postgres.railway.internal` only work **inside** Railway’s network (the API container). To run `reset-admin-users` on your machine against production data, copy the **public** TCP connection string from Railway → Postgres → **Connect** (not the internal hostname), put it in `backend/.env.railway` (see [`backend/.env.railway.example`](backend/.env.railway.example); that file is gitignored). The script loads `.env` first, then `.env.railway` overrides `DATABASE_URL` when present. Alternatively run the script **on Railway**: `railway run --service <api> npm run reset-admin-users` (uses the service’s env, including internal DB URL).

### API tests (integration)

Requires Postgres reachable at `DATABASE_URL` (same as dev). Runs migrations then Vitest:

```bash
cd backend
npm test
```

### E2E tests (Playwright)

With Postgres, the API, and the Next dev server already running (`npm run dev` in `backend/` and `frontend/` with matching `NEXT_PUBLIC_API_URL`):

```bash
cd e2e
npm ci
npx playwright install chromium
npm run test:e2e
```

Tests live in `e2e/tests/`. In CI, the HTML report is uploaded as an artifact when Playwright fails; locally the default reporter is `list` (run with `CI=true` to match CI reporters including HTML).

### CI (GitHub Actions)

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on push/PR to `main` or `master`:

- **backend-test** — Vitest integration tests against a Postgres service container  
- **frontend-build** — `next build`  
- **e2e** — migrates DB, starts API + `next start`, runs Playwright (Chromium)  
- **docker-trivy** — `docker compose --profile stack build`, then [Trivy](https://github.com/aquasecurity/trivy-action) scans `mhcet-api:local` and `mhcet-web:local` (HIGH/CRITICAL table output; `exit-code: 0` so findings are visible without failing the job—tighten in the workflow when you want CI to block on vulns)

### Docker image scan locally

After `docker compose --profile stack build`, you can run Trivy against the same tags (`mhcet-api:local`, `mhcet-web:local`) with the [`aquasecurity/trivy`](https://github.com/aquasecurity/trivy) CLI.

## Frontend

```bash
cd frontend
cp .env.example .env.local

npm install
npm run dev
```

Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` to match the API origin.

### Hard rule — `NEXT_PUBLIC_API_URL` (Vercel / any static host)

1. **Never deploy** the frontend without confirming **`NEXT_PUBLIC_API_URL`** is exactly your **live API origin** (scheme + host, e.g. `https://your-api.up.railway.app` — typically **no trailing slash**).
2. This variable is **baked at `next build`**. Updating env in the dashboard **without a new build** does **not** change what the browser calls — **redeploy** (or trigger a fresh build) after every API URL change.
3. After deploy, open **DevTools → Console**: the app logs **`API URL:`** with the value from the bundle so you can sanity-check production in seconds.

## Environment variables

| App      | Variable              | Purpose                          |
|----------|-----------------------|----------------------------------|
| Backend  | `DATABASE_URL`        | PostgreSQL connection string     |
| Backend  | `JWT_SECRET`          | Sign JWT access tokens           |
| Backend  | `JWT_EXPIRES_IN`      | Token lifetime (default `7d`)    |
| Backend  | `OPENAI_API_KEY`      | Explanations feature (**server only**; never use in Next `NEXT_PUBLIC_*`) |
| Backend  | `OPENAI_MODEL`        | e.g. `gpt-4o-mini`               |
| Backend  | `EXPLAIN_DAILY_LIMIT` | Max **OpenAI** explanation calls per user per **UTC** day (default `5`). Identical questions reuse DB cache and do **not** count. |
| Backend  | `FREE_TESTS_PER_DAY` | Max **new mock attempts** per **UTC** day for `users.plan = free` (default `2`). `plan = paid` is unlimited. Admins set plan via `PUT /api/admin/users/:id/plan`. |
| Backend  | `CORS_ORIGIN`         | Comma-separated browser origins. **Development:** merged with localhost defaults. **Production** (`NODE_ENV=production`): only these origins are allowed; set explicitly (e.g. `https://your-app.vercel.app`). **Required** for browser login from Vercel — without it the API returns **403** on CORS and the UI shows “Unable to connect”. |
| Backend  | `CORS_ALLOW_VERCEL_APP` | In **production**, **`https://*.vercel.app`** is allowed **by default** so Vercel login works without extra env. Set to **`false`** or **`0`** to disable and rely only on **`CORS_ORIGIN`** (stricter). |
| Backend  | `TRUST_PROXY`         | Set to `true` when the API sits behind a reverse proxy so `X-Forwarded-*` is trusted. |
| Backend  | `NODE_ENV`            | Use `production` behind a real deployment for stricter CORS and logging behavior. |
| Backend  | `AI_PROVIDER`         | `mock` (default, no key), `openai`, or `local`. Controls how `POST /api/explain` generates text. **`mock` = no external LLM bill** (good default for prod cost control). |
| Backend  | `EXPLAIN_KILL_SWITCH` | **`true` / `1` / `yes`** — emergency override: forces **`mock`** for explanations **even if** `AI_PROVIDER` is `openai` or `local` (no OpenAI/local outbound calls). Use during billing spikes; restart/redeploy picks up env. |
| Backend  | `MOCK_EXPLAIN_MODEL`  | Optional; bumps cache key for mock explanations (e.g. `mock-v2`). |
| Backend  | `LOCAL_LLM_URL`       | OpenAI-compatible base URL including `/v1`, e.g. `http://127.0.0.1:11434/v1` (used when `AI_PROVIDER=local`). |
| Backend  | `LOCAL_LLM_MODEL`     | Model id for the local server (default `local-llm`). |
| Backend  | `SKIP_DB_MIGRATE`     | Set to `true` only if you run `npm run migrate` **outside** the container (e.g. CI). **Railway + Dockerfile:** leave **unset** or `false` so [`docker-entrypoint.sh`](backend/docker-entrypoint.sh) runs migrations **after** `DATABASE_URL` is injected (pre-deploy hooks often lack DB env). |
| Frontend | `NEXT_PUBLIC_API_URL` | API base URL (e.g. `http://localhost:4000`). **Build-time:** inlined at `next build`; must match production API; redeploy after changes. |
| Frontend | `NEXT_PUBLIC_SITE_URL` | Canonical site URL for Open Graph / metadata (no trailing slash), e.g. `https://your-app.vercel.app`. Defaults to `http://localhost:3000` if unset. |

## Production API (Railway): migrations vs start

[`backend/Dockerfile`](backend/Dockerfile) uses [`docker-entrypoint.sh`](backend/docker-entrypoint.sh): unless **`SKIP_DB_MIGRATE=true`**, it runs **`npm run migrate`** then starts the server. That runs in the **same** environment as the running service, so **`DATABASE_URL` is always available** (unlike some hosts’ **pre-deploy** steps, which may not inject linked variables).

**Railway (recommended)**

1. Do **not** set `SKIP_DB_MIGRATE` (or set it to `false`) so each deploy migrates on container start.
2. Migrations use a **PostgreSQL advisory lock**, so multiple replicas or overlapping deploys **serialize** instead of racing.
3. [`backend/railway.json`](backend/railway.json) only sets **`startCommand`** / **healthcheck** — no pre-deploy migrate (avoids `DATABASE_URL is required` when the pre-deploy phase has no DB env).

If you **must** skip in-container migrate (e.g. external release job), set **`SKIP_DB_MIGRATE=true`** and run `npm run migrate` in that job with the same `DATABASE_URL`.

**Local / Docker Compose** — leave `SKIP_DB_MIGRATE` unset; same entrypoint behavior.

**Option B (manual)** — `npm start` only with `SKIP_DB_MIGRATE=true`; run `railway run … npm run migrate` when needed. Advisory lock still protects overlaps.

## Production safeguards (backend)

- **CORS** — Rejected browser origins call `callback(new Error("Not allowed by CORS"))` so the server returns **403** `{ "error": "CORS: origin not allowed" }` instead of failing only in the browser.
- **`GET /health`** — Returns `status` (`ok` \| `degraded`), `database` (`up` \| `down`), `uptime` (seconds), `env`; HTTP **503** when the database check fails (so load balancers can mark the instance unhealthy).
- **Request timeout** — Responses that do not finish within **10s** get **503** `{ "error": "Request timeout" }`.
- **Logging** — Each request emits structured **`http_request_start`** (method, path, `requestId`) and **`http_request`** on finish (status, duration). No JWT/body logging.
- **Rate limits** — Global **`/api`** cap **200 req/min per IP** (abuse / runaway clients). **`POST /api/explain`** also has a stricter per-IP limit (~25/min) plus per-user daily OpenAI quota and DB cache — see env table and `explainService`.

## Cold start (Railway / sleep)

Hobby or scaled-to-zero hosts can wake slowly; the first request may see **502 / 503 / 504** or a **failed fetch**. The **frontend** HTTP client (`frontend/lib/api.ts`) retries up to **3 attempts** with short backoff on **transient HTTP** (502, 503, 504) and **retryable network errors** (skips retries when **offline** or **AbortError**). Error **toasts** fire only on the **final** failure. Optionally use an external **uptime ping** (e.g. [UptimeRobot](https://uptimerobot.com/) or a cron `curl`) against **`GET /health`** on your API URL to reduce cold wakes for real users.

## Deploy checklist (Vercel + Railway)

| Backend (Railway) | Frontend (Vercel) | Integration |
|-------------------|-------------------|-------------|
| `DATABASE_URL` set | `NEXT_PUBLIC_API_URL` = API HTTPS origin | Login works |
| `JWT_SECRET` set | No secrets in `NEXT_PUBLIC_*` | Start mock → submit → results |
| `CORS_ORIGIN` = Vercel URL(s) | Build succeeds | `/health` → `status: "ok"`, `database: "up"` |
| `TRUST_PROXY=true` | | |
| `SKIP_DB_MIGRATE` unset (migrate in entrypoint) or external migrate + `SKIP_DB_MIGRATE=true` | | |

## Troubleshooting registration / login

- **Railway: pre-deploy / migrate fails with `DATABASE_URL is required`** — Remove **`preDeployCommand`** migrate from the host (this repo’s `railway.json` has none) and **unset `SKIP_DB_MIGRATE`** so migrations run in **docker-entrypoint** where `DATABASE_URL` exists. Delete any **`SKIP_DB_MIGRATE=true`** you added for the old pre-deploy flow.
- **Production: “Unable to connect” on login** — Almost always **CORS** (browser console shows `Access-Control-Allow-Origin`). **Redeploy the Railway API** (latest code allows `https://*.vercel.app` by default in production). If it still fails, set **`CORS_ORIGIN=https://mhcet-coral.vercel.app`** (exact) on Railway, or **`CORS_ALLOW_VERCEL_APP=false`** only if you intentionally use a strict allow-list. `curl` to `/health` can still be **200** while the browser is blocked.
- **Backend must be running** on the port in `NEXT_PUBLIC_API_URL` (usually `4000`). Check `GET http://localhost:4000/health` returns **`status`: `"ok"`** and **`database`: `"up"`** (HTTP 200).
- **`frontend/.env.local`** must set `NEXT_PUBLIC_API_URL` (restart `npm run dev` after changing it).
- **Postgres must be running** and `DATABASE_URL` correct, with `npm run migrate` applied. DB errors often show as “Something went wrong” from the API. The value must be a single URL (e.g. `DATABASE_URL=postgresql://...`), not `DATABASE_URL=DATABASE_URL=...`. Check `/health`: `database` should be `"up"`.
- Use **`http://localhost:3000`** or **`http://127.0.0.1:3000`** when possible; in **development**, CORS allows **`http://localhost` / `127.0.0.1` on ports 3000–3999** so Next’s fallback ports (3001, 3002, …) still work.

## Roadmap

Product phases, implemented features, and maintainer checklist: **[docs/ROADMAP.md](docs/ROADMAP.md)** (update that file when you refactor APIs or ship features).

## API overview

- `GET /health` — `{ status, database, uptime, env }`; **503** if DB unreachable  
- `POST /api/auth/register` — create user, returns JWT  
- `POST /api/auth/login` — returns JWT  
- `GET /api/tests` — list tests (auth)  
- `GET /api/tests/:testId` — test + questions without correct answers  
- `GET /api/attempts` — attempts for current user (`in_progress` first, then `submitted`, newest first)  
- `GET /api/attempts/:id/resume` — resume payload for an `in_progress` attempt (requires `testId` match on take page)  
- `POST /api/attempts` — start attempt for `testId` (**403** `Limit reached` when free tier has hit `FREE_TESTS_PER_DAY` for the UTC day)  
- `GET /api/config` — `{ explainAvailable, plan, testsTodayUtc, freeTestsPerDay, canStartMock, … }`  
- `PATCH /api/attempts/:id/answers` — autosave selection  
- `POST /api/attempts/:id/submit` — grade and finalize  
- `GET /api/attempts/:id/results` — score + per-question review  
- `POST /api/explain` — `{ attemptId, questionId, question, options: {A,B,C,D}, correctAnswer }` (optional fields validated against DB when sent) — returns `{ answer, explanation, concept, example }`. Responses are **cached in Postgres** by question content hash + model; **per-user quota** applies only when OpenAI is called. **IP burst** limit ~25/min on this route.

### AI explanations (production behavior)

- **Caching:** First successful explanation per question revision (prompt/options/answer/model) is stored in `question_explanations`; later users and repeat opens hit the DB only (fast).
- **Quota:** Each user gets `EXPLAIN_DAILY_LIMIT` (default 5) **OpenAI-backed** generations per **UTC calendar day**. Cached repeats do not increment usage.
- **Cost control:** Prefer **`AI_PROVIDER=mock`** in production unless you intentionally pay for LLM calls. **`EXPLAIN_KILL_SWITCH=true`** forces **mock** immediately (overrides `openai` / `local`) — use if a billing spike hits; no OpenAI/local outbound traffic. **`EXPLAIN_AI_ENABLED=false`** turns explanations off entirely (503 on `POST /api/explain`).
- **Retries:** The server retries transient OpenAI failures up to 3 times with backoff.
- **Secrets:** Only the backend reads `OPENAI_API_KEY`; do not expose it to the browser or commit it.

## Project layout

- `backend/` — Express, migrations in `src/db/migrations`, seed in `src/db/seed.js`  
- `frontend/` — Next.js App Router, Tailwind, components under `components/`  
- `e2e/` — Playwright end-to-end tests (`npm run test:e2e` from this folder)
