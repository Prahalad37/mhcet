# MHCET — product roadmap & maintainer log

**Purpose:** Single source of truth for what we are building, what is done, and what comes next.  
**Rule for humans & AI:** When you refactor features or change APIs, update the **Implemented** and **Changelog** sections in the same PR or follow-up commit.

---

## Changelog (keep short)

| Date (UTC) | Change |
|------------|--------|
| 2026-04-07 | **CORS (Railway + Vercel):** production defaults to allowing `https://*.vercel.app` (opt out `CORS_ALLOW_VERCEL_APP=false`); Helmet **`crossOriginResourcePolicy: cross-origin`** so browser reads succeed after CORS. README troubleshooting for login + `CORS_ORIGIN`. |
| 2026-04-07 | **API base URL normalization:** `getApiBaseUrl()` (`frontend/lib/apiBaseUrl.ts`) prepends `https://` when `NEXT_PUBLIC_API_URL` has no scheme so `fetch` hits Railway instead of resolving as a path on the Vercel app (login 404). |
| 2026-04-06 | **Exam integrity + auth hardening (P0/P1):** added attempt result snapshots (`010_attempt_result_snapshots_and_practice_answers.sql`) and now `GET /api/attempts/:id/results` reads immutable snapshot rows; admin test delete always soft-deletes when submitted attempts exist; practice scoring now dedupes per `session_id + question_id`; login/register now honor safe `next` redirect; admin middleware re-checks role from DB (faster revocation); auth endpoints now have stricter limiter; explain quota flow reserves slot before generation and releases on failures; API abort signal fallback improved for runtimes without `AbortSignal.any`. |
| 2026-04-05 | **CSV import:** `parseCSV` strips UTF-8 BOM, normalizes `\r\n`, maps Excel-style headers (`Question`, `Option A`, `Prompt`, `Answer`, etc.) to canonical `question` / `optionA` / …; clearer error when columns still mismatch. |
| 2026-04-05 | **Deployment UI polish (frontend):** **`autoprefixer`** in PostCSS; dynamic **`app/icon`** (ImageResponse); root **`metadataBase`** + Open Graph / Twitter via **`NEXT_PUBLIC_SITE_URL`** (`getSiteUrl` in `frontend/lib/siteUrl.ts`); **`SiteFooter`**, skip link, flex shell; **`BuildTimeApiUrlLog`** dev-only; focus-visible on **SiteNav** / home / auth links; **`Input`** focus ring; admin **h1** unified (`text-2xl font-semibold tracking-tight`); take route **Suspense** uses **`PageLoadingState`**. |
| 2026-04-05 | **Explain billing kill switch:** **`EXPLAIN_KILL_SWITCH=true`** forces **`mock`** provider in `getExplainProviderId()` (overrides `AI_PROVIDER`); `/api/config` `aiProvider` reflects effective provider; startup **`logWarn`**. README + `.env.example`. |
| 2026-04-05 | **Frontend build trap:** README **hard rule** for `NEXT_PUBLIC_API_URL` (bake at build, redeploy on change). Client **`BuildTimeApiUrlLog`** → `console.log("API URL:", …)` once on load for deploy verification. |
| 2026-04-05 | **Cold start:** `api()` retries up to **3** attempts with backoff on **502/503/504** and retryable **fetch** errors; toasts only on final failure. README: optional **`/health`** uptime ping. |
| 2026-04-05 | **Frontend API UX:** **`sonner`** toasts on failed `api()` (non-OK, network) with API `error` message or **"Server unavailable"**. **`noErrorToast`** for screens that already show inline/page errors (auth, tests, take, results, practice, explain modal, admin). Raw admin CSV `fetch` failures toast before throw. |
| 2026-04-05 | **Prod hardening:** CORS rejects unknown origins with **`Error("Not allowed by CORS")`** → **403** JSON (not browser-only). **`GET /health`** returns `status`, `uptime`, `env`, **503** if DB down. **10s** request timeout (**503**). **`http_request_start`** + existing access line. **Global `/api` rate limit** (200/min/IP) + existing explain limits. README: Option A/B migrations, deploy checklist, safeguards. |
| 2026-04-05 | **Deploy safety:** `migrate.js` uses **PostgreSQL `pg_advisory_lock`** so concurrent migration processes cannot race. **Railway:** `backend/railway.json` — pre-deploy `npm run migrate`, start `npm start`; **`SKIP_DB_MIGRATE=true`** + Docker entrypoint skips duplicate migrate on each replica. README documents pattern (avoid only `migrate && start` at scale). |
| 2026-04-05 | **Business layer (early):** `users.plan` `free` \| `paid` (migration `009`). `POST /api/attempts` returns **403** `{ error: "Limit reached" }` when free user has ≥ `FREE_TESTS_PER_DAY` (default 2) mocks **started** this UTC day. `GET /api/config` adds `plan`, `testsTodayUtc`, `freeTestsPerDay`, `canStartMock`. Admin `PUT /api/admin/users/:id/plan`. Tests list UI shows usage and disables new starts when capped. |
| 2026-04-05 | **`PageLoadingState`**: visible label under spinner + `aria-busy`; optional `compact` prop. |
| 2026-04-05 | **Take test UX / speed**: non-blocking answer sync (palette & prev/next while saving); **flush pending PATCHes** before submit; **keyboard** ← → and **M** (mark for review); **sticky** exam-style palette + legend; memoized palette/options; cleaner loading copy; submit gated only on `submitting`. |
| 2026-04-05 | **Results page (retention)**: prominent **Accuracy %**, **Attempt summary** (right/wrong/skipped, submitted time, time allowed), green/red **visuals** (card border + per-option highlights), **inline static explanations** when `official_explanation` exists; optional full-screen modal. |
| 2026-04-05 | **Exam engine hardening**: `POST /api/attempts` and `GET /api/attempts/:id/resume` return **`endsAt`** (server deadline, ISO). `PATCH .../answers` rejected after deadline; **`POST .../submit`** idempotent (200 + score if already submitted). Scoring uses `TRIM` on options and counts correct only via join to current test questions; submit handler uses safe rollback. Take page timer prefers `endsAt`; submit lock stays until success; `TestTimer` resyncs when deadline changes. |
| 2026-04-05 | **AI provider abstraction**: `AI_PROVIDER=mock|openai|local` (default **mock**). `backend/src/services/ai/` — mock (hash-based structured explanations, no key), OpenAI adapter, local OpenAI-compatible HTTP. Daily quota applies only to OpenAI. `GET /api/config` includes `aiProvider`. |
| 2026-04-05 | **Phase C closed** in roadmap; **Phase D** (AI ops: monitoring, cost, optional routing/prompts) is the next named phase. |
| 2026-04-05 | **Phase C (continued)**: Playwright e2e (`e2e/`, Chromium). GitHub Actions CI (`.github/workflows/ci.yml`): backend Vitest, frontend build, e2e + artifact upload, Trivy scan of `mhcet-api:local` / `mhcet-web:local`. Compose: API image `HEALTHCHECK` + `curl` in Dockerfile; `api` service `healthcheck`; `web` waits on `api` `service_healthy`. |
| 2026-04-05 | **Phase C (initial)**: Vitest + Supertest API integration tests (`backend/test/`). `docker compose --profile stack` for Postgres + API + Next (standalone) images; `backend/Dockerfile`, `frontend/Dockerfile`. Request IDs (`X-Request-Id`), structured JSON access logs, production CORS (`CORS_ORIGIN` only when `NODE_ENV=production`), `TRUST_PROXY`, safer error logging (no JWT/password logging). |
| 2026-04-05 | **Admin UI**: `/admin/tests/[id]/edit` and `/admin/tests/[id]/questions` (list, add, edit, delete, reorder). Import page respects `?testId=` to preselect target test. Shared `adminTopicOptions` for test topics / question subjects. |
| 2026-04-02 | Added **Attempt history**: `GET /api/attempts`, UI `/attempts`, nav **History**. Roadmap doc created. |
| 2026-04-04 | **Explain off UX**: `GET /api/config`, results page hides Explain when unavailable. **Resume**: `GET /api/attempts/:id/resume`, take page `?attemptId=`, history + tests **Continue**. **Results analytics** card from `/api/analytics/insights`. |
| 2026-04-04 | **Static explanations**: migration `004` — `questions.hint`, `questions.official_explanation`. Returned only on `GET /api/attempts/:id/results`; results UI **View explanation** when AI off. Seed includes sample text for first two MCQs. |
| 2026-04-04 | **Seed: five full mocks** — `seedData/fullMocks.js`: 5 × 30 MCQs (Legal / GK / Logical / Math / English mix, 120 min each); `seed.js` imports this for empty DB only. |
| 2026-04-04 | **`npm run seed:reset`** — `DELETE FROM tests` (CASCADE clears attempts/answers/questions/explain cache rows tied to those questions) then re-inserts mocks. |
| 2026-04-04 | **Practice mode**: per-question `subject` column (migration `005`), `practice_sessions` table (`006`). API: `GET /api/practice/subjects`, `POST /start`, `POST /:id/check`, `POST /:id/complete`. UI: `/practice` subject picker, `/practice/[sessionId]` instant-feedback drill. Nav link added. |
| 2026-04-04 | **Admin system**: user roles (migration `007`), audit logs (`008`). API: `/api/admin/*` (tests/questions/users CRUD, CSV import, stats), `/api/audit/*` (logs). UI: `/admin/*` panel with dashboard, tests management, import, users, audit viewer. Role-based nav. |

---

## Tech stack (fixed for this repo)

- **Frontend:** Next.js App Router, Tailwind, port **3000**
- **Backend:** Express, port **4000**
- **DB:** PostgreSQL, migrations in `backend/src/db/migrations/`

---

## Implemented (living list)

- [x] Auth (JWT), register/login
- [x] Tests list + detail + timed attempt + palette / mark for review / tab warning / auto-submit
- [x] Results page per attempt
- [x] AI explanations (`POST /api/explain`) — optional, needs `OPENAI_API_KEY`; cache + daily quota in DB
- [x] Analytics: weak topics + recommendations (`GET /api/analytics/insights`), `tests.topic` column
- [x] Google-style explanation modal (UI-only follow-up)
- [x] **Attempt history** — `GET /api/attempts` (in_progress + submitted), page `/attempts`
- [x] **Resume attempt** — `GET /api/attempts/:id/resume`, `/tests/[id]/take?attemptId=`
- [x] **Explain off UX** — `GET /api/config`, results page messaging + no Explain button when disabled
- [x] **Results analytics** — insights snippet on results page + link to tests
- [x] **Static hints / official explanations** — DB columns on `questions`; results API + review UI (modal when AI off); not exposed during active attempt
- [x] **Practice mode** — per-question `subject` tag, untimed topic-wise drill (`/practice`), instant feedback per answer, session tracking (`practice_sessions`)
- [x] **Admin system** — user roles (`users.role`), admin middleware, CRUD APIs (`/api/admin/*`), CSV import, audit logging (`audit_logs`), admin panel UI (`/admin/*`) including per-test edit and question management + reorder
- [x] **Phase C — Quality & deploy** — API integration tests (`npm test` in `backend/`); Dockerfiles + `docker compose --profile stack` (tagged `mhcet-api:local` / `mhcet-web:local`); API healthchecks; structured logs + request IDs; production CORS rules; optional `TRUST_PROXY`; Playwright e2e (`e2e/`); GitHub Actions CI + Trivy image scan job. *Optional follow-ups:* fail CI on Trivy (`exit-code: 1`), SARIF upload to GitHub Security.
- [x] **Phase 2 — Product polish** — Results: accuracy %, attempt summary, green/red review, inline static explanations. Take test: exam-style sticky palette, mark for review, keyboard navigation, non-blocking saves + flush-before-submit, memoized controls. Shared visible loading copy via `PageLoadingState`.
- [x] **Deployment-ready UI (shell)** — Favicon route, canonical URL metadata, site footer, skip-to-content link, keyboard focus rings on primary nav/CTAs, PostCSS autoprefixer, admin page title consistency.
- [x] **P0/P1 hardening** — immutable result snapshots at submit time, submitted-attempt-safe admin delete behavior, practice score dedupe, auth `next` redirect continuity, DB-backed admin role check, auth-specific rate limiter, explain quota reservation/release flow, and API abort fallback compatibility.

---

## Phase 0 — OpenAI optional / dev-friendly (near-term)

**Goal:** App feels complete without a paid API.

1. **Feature flag** — e.g. `EXPLAIN_AI_ENABLED=false` or derive from key presence; optional `GET /api/config` with `{ explainAvailable: boolean }`.
2. **UI** — Hide or disable **Explain** when unavailable; copy: “Explanations coming soon” / “Enable on server”.
3. **Static hints (optional)** — ~~Migration: `questions.hint TEXT` or `questions.official_explanation TEXT`; modal reads from DB when AI off.~~ **Done** (`004_questions_hint_official_explanation.sql`).
4. **Docs** — README: “Explanations are optional” + link to this file.

---

## Phase A — Core product (no admin yet)

1. **Results polish** — Show topic + **analytics snippet** on results page (reuse insights or per-attempt summary).
2. **In-progress attempts** — List abandoned attempts; **resume same attempt** (needs `GET /api/attempts/:id` for in-progress state + take page `?attemptId=` or dedicated resume route).
3. **Better empty/error states** — Network, 503, session expiry.
4. **Content** — More seeded tests; optional import script (JSON/CSV).

---

## Phase B — Admin & content ops

1. **Role** — `users.role` or `is_admin`; middleware `requireAdmin`.
2. **CRUD** — Tests, questions, topics; activate/deactivate tests.
3. **Bulk import** — CSV → questions with validation.
4. **Audit** — Who changed what (lightweight `updated_at` / `edited_by` optional).

---

## Phase C — Quality & deploy — **done** (optional polish: Trivy gate, SARIF)

1. **Tests** — ~~API integration tests (supertest)~~ — `backend/test/integration`, `npm test`. ~~Playwright e2e~~ — `e2e/tests`, `cd e2e && npm run test:e2e` (requires API + Next + DB).
2. **Docker** — ~~Compose profile `stack`: Postgres + API + Next standalone build~~ — see `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`. ~~API healthchecks~~ (`HEALTHCHECK` + compose `healthcheck`; `web` depends on healthy `api`).
3. **Prod** — Secrets stay in env / your host secret manager (not in repo). ~~Hardened CORS~~ (`NODE_ENV=production` + `CORS_ORIGIN`). HTTPS terminates at reverse proxy. ~~Log redaction helpers~~ in `logger.js` for error strings.
4. **Observability** — ~~Request ids (`X-Request-Id`) + structured JSON access lines~~ (`httpLog` + `logger`).
5. **CI** — ~~GitHub Actions~~ — `.github/workflows/ci.yml` (backend tests, frontend build, e2e, Trivy on stack images). *Optional next:* fail CI on Trivy findings (`exit-code: 1`), SARIF upload to GitHub Security.

---

## Phase D — AI (when re-enabled) — **current focus after Phase C**

1. ~~Provider abstraction~~ — `AI_PROVIDER`, `services/ai/` (mock default, OpenAI, local compatible API).
2. Keep existing cache + quota; monitor OpenAI errors and cost (mock/local bypass OpenAI quota).
3. Optional: richer prompt versions, multi-turn (only if product needs).

---

## API surface (snapshot — update when routes change)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/attempts` | **History** — in_progress + submitted |
| GET | `/api/attempts/:id/resume` | Resume; includes **`endsAt`** (deadline, ISO) |
| GET | `/api/config` | `{ explainAvailable, plan, testsTodayUtc, freeTestsPerDay, canStartMock, aiProvider }` |
| PUT | `/api/admin/users/:id/plan` | Set `free` / `paid` (admin) |
| POST | `/api/attempts` | Start attempt; includes **`endsAt`**; **403** if free daily cap reached |
| PATCH | `/api/attempts/:id/answers` | Save answer; **400** after **`endsAt`** |
| POST | `/api/attempts/:id/submit` | Submit; **idempotent** (200 if already submitted) |
| GET | `/api/attempts/:id/results` | Results detail; each question may include `hint`, `officialExplanation` (DB `official_explanation`) |
| GET | `/api/tests` | List tests |
| GET | `/api/tests/:testId` | Test + questions |
| GET | `/api/analytics/insights` | Weak topics + recommendations |
| GET | `/api/practice/subjects` | Subject list + question counts |
| POST | `/api/practice/start` | Start practice session (subject, count) |
| POST | `/api/practice/:id/check` | Check answer, instant feedback |
| POST | `/api/practice/:id/complete` | Complete session, get summary |
| GET | `/api/admin/stats` | Admin dashboard statistics |
| GET | `/api/admin/tests` | Admin: list all tests (including inactive) |
| POST | `/api/admin/tests` | Admin: create test |
| PUT | `/api/admin/tests/:id` | Admin: update test |
| DELETE | `/api/admin/tests/:id` | Admin: delete test (soft if submitted attempts exist; hard only when none) |
| GET | `/api/admin/tests/:testId/questions` | Admin: list questions with answers |
| POST | `/api/admin/tests/:testId/questions` | Admin: add question |
| PUT | `/api/admin/questions/:id` | Admin: update question |
| DELETE | `/api/admin/questions/:id` | Admin: delete question |
| GET | `/api/admin/users` | Admin: list users with stats |
| PUT | `/api/admin/users/:id/role` | Admin: change user role |
| GET | `/api/admin/import/template` | Admin: download CSV template |
| POST | `/api/admin/import/questions/:testId` | Admin: import questions from CSV |
| GET | `/api/audit/logs` | Admin: audit logs with pagination |
| POST | `/api/explain` | Optional AI |

---

## Risks / decisions log

- **Resume attempt:** Implemented (`GET /api/attempts/:id/resume` + take flow support); maintain server-authoritative timer checks as this evolves.
- **Topic column:** Requires migration `003_tests_topic.sql` applied; history query joins `tests.topic`.

---

## Maintainer checklist (refactors)

- [ ] Updated **Implemented** or **Phase** sections above
- [ ] Updated **API surface** table if routes changed
- [ ] Appended **Changelog** row with date
- [ ] README cross-link if user-facing behavior changed
