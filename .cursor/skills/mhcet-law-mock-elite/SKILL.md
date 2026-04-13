---
name: mhcet-law-mock-elite
description: >
  Production-grade workflow for PrepMaster / MHCET Law mock exams: Next.js 14 (3000), Express ESM (4000),
  PostgreSQL, JWT, BullMQ explain jobs, tenant-aware catalog, immutable attempts & result snapshots.
  Use for features, reviews, exam-engine hardening, admin/import/explain flows, and deploy-minded changes.
---

# MHCET Law Mock — elite production discipline

## Authority stack (read in this order)

1. **`/.cursorrules`** — project-specific never-dos (sync CSV upload import, no migration edits, logger usage).
2. **`/docs/ROADMAP.md`** — implemented features, changelog, API evolution; **update** when you change user-facing behavior or public API shape.
3. **This skill** — workflow, domain rules, and a completion bar agents can follow without re-deriving everything.

If `.cursorrules` and ROADMAP disagree on a detail, **trust the code** next, then reconcile docs in the same change set when you can.

## Stance

Act as a senior production engineer and restrained product owner. Optimize for **correctness**, **security**, **clarity for law-exam candidates**, and **shippable** diffs. No demo-only code paths; no “we’ll fix later” around timer, scoring, or auth.

## System map (mental model)

| Layer | Location | Notes |
|-------|-----------|--------|
| Web | `frontend/` | Next.js 14 App Router, **TypeScript**, **Tailwind** (see `tailwind.config.ts`, `app/global.css`). |
| API | `backend/src/` | Express **ESM** (`"type": "module"`). Entry: `index.js` / `app.js`. |
| DB | `backend/src/db/migrations/` | Sequential `NNN_*.sql`. **Never edit** applied files — add `015_…`. |
| Jobs | `backend/src/jobs/`, `workers/` | **Explain** requires `REDIS_URL` + `npm run worker`. |
| E2E / CI | `e2e/`, `.github/workflows/` | Playwright + Vitest integration tests. |

**Ports:** API **4000**, Next **3000**, Postgres **5432** (local). Root `npm run dev` kills stale ports then runs both.

## Before you write code

- **Do not assume** routes or JSON shapes: open the matching file under `backend/src/routes/` and the consumer in `frontend/lib/*.ts` or `app/**/page.tsx`.
- **Do not assume** columns: grep migrations + the handler’s SQL.
- **Do not break** existing API contracts without a deliberate plan (versioning, feature flag, or coordinated frontend + backend deploy).

## Environment & secrets

- **Secrets only** in `backend/.env` (gitignored): `JWT_SECRET`, `DATABASE_URL`, provider keys (`DEEPSEEK_API_KEY` / `OPENAI_API_KEY` depending on config), `REDIS_URL` for queues.
- **`frontend/.env.local`**: public config only — e.g. `NEXT_PUBLIC_API_URL`, optional `NEXT_PUBLIC_SITE_URL`, analytics IDs. **Never** ship provider keys in `NEXT_PUBLIC_*`.
- **`DATABASE_URL`**: exactly one assignment per line; duplicate key text inside the value causes painful `ENOTFOUND` failures.
- If required env is missing for the task, **stop** and report it; do not bake fake keys or silent fallbacks that hide misconfiguration.

## Database

- **Parameterized SQL only** (`$1`, `$2`, …). No string concatenation of user-controlled fragments.
- Use **transactions** when multiple writes must commit or roll back together (submit + snapshot + score, admin ops that touch several tables).
- New schema → **new** migration file → `cd backend && npm run migrate`. Prefer idempotent-safe patterns consistent with existing migrations.

### Schema you will touch often

- **`users`** — `role` (`admin` \| `student`), `plan`, optional tenant FK.
- **`tenants`** — B2B institutes; JWT may carry `tenantId`.
- **`tests`** — `author_id` **NULL** = platform catalog; personal “my mocks” have `author_id = user`. **`tenant_id`** scopes catalog for B2B.
- **`questions`** — MCQ fields, `subject`, `hint`, `official_explanation`.
- **`attempts`**, **`answers`** — exam state; submitted attempts are **immutable**; results often served from **snapshots** (see migration `010`).
- **`question_explanations`** — AI cache (migration `014`); content keyed by question + hash.

## API design (backend)

- Validate bodies and params with **Zod**; use **`HttpError`** + global **`errorHandler`** (`backend/src/middleware/errorHandler.js`).
- **`next(e)`** from async handlers — do not send ad-hoc error shapes that bypass the error handler.
- **Never** return stack traces or internal exception strings to clients. **Never** log JWTs, passwords, `Authorization` headers, or API keys — use **`logInfo` / `logWarn`** from `backend/src/utils/logger.js` (not raw `console.log` per `.cursorrules`).

## Domain — exam simulation (non-negotiables)

This is a **timed exam simulator**, not a generic quiz app.

1. **Timer / deadline** — Server is authoritative: `endsAt` (ISO) from `POST /api/attempts` and resume routes drives the client. Reject or finalize when wall-clock is past the server deadline; browser time is UX only.
2. **Scoring** — Computed **only on the server** on submit (or idempotent re-submit). Never trust the client for final score or correct counts.
3. **Attempts** — Prevent double-submit and mutation of **submitted** attempts. Submit path should be **idempotent** where already implemented.
4. **Negative marking** — **None** unless product explicitly changes it.
5. **During live attempt** — Do not leak `official_explanation` / answers in APIs meant for the in-progress exam UI.

## AI explanations

- **`POST /api/explain`** enqueues BullMQ work; responds with **202** + `jobId` when Redis is configured. Client polls **`GET /api/jobs/:jobId`** (see `frontend/lib/jobPoll.ts` patterns).
- Worker: `npm run worker` in `backend/` (local dev). Production needs **`REDIS_URL`** on the API service **and** a worker process.
- Logic + cache + quota live in **`backend/src/services/explainService.js`** — keys and model calls stay **server-side** only.
- Static copy: `questions.official_explanation` / hint on results APIs when AI is off — preserve that path.
- Kill switch / provider selection: respect env documented in `backend/.env.example` (e.g. `EXPLAIN_KILL_SWITCH`, `AI_PROVIDER`).

Structured explanation fields (align with existing cache/API):

```json
{
  "answer": "",
  "explanation": "",
  "concept": "",
  "example": ""
}
```

## CSV import (know both paths)

- **Multipart upload** `POST /api/admin/import/questions/:testId` (file field) runs **`importQuestionsFromCSV` synchronously** and returns **200** `{ status: "done", ... }`. This is what production admin UI should rely on — **no import worker required** (see comments in `backend/src/routes/admin.js`).
- **`POST .../import/questions/:testId/text`** still enqueues to BullMQ when `REDIS_URL` is set (**202** + poll). Treat as **secondary** (API/testing); do not switch the main admin UI to this without a running worker.

Parser details: **`backend/src/utils/csvParser.js`** — BOM strip, flexible headers. Canonical columns match `.cursorrules` / docs.

## Frontend

- **HTTP client:** `frontend/lib/api.ts` — `api()` / `apiFetch`, token from `frontend/lib/auth.ts`, base URL from **`getApiBaseUrl()`** (`frontend/lib/apiBaseUrl.ts`) so missing `https://` does not break production.
- **Retries & timeout:** `api.ts` implements cold-start retries and a manual timeout when `AbortSignal.timeout` is missing — do not rip this out casually.
- **Toasts:** default error toasts; use **`noErrorToast`** when the screen already shows a full error state.
- **Feature libs:** `adminApi.ts`, `dashboardApi.ts`, `myMocksApi.ts`, `authApi.ts`, `jobPoll.ts` — extend these instead of one-off `fetch` scattered in pages.
- **UX guardrails:** loading / error / empty states; disable primary actions while in-flight; avoid duplicate submits on pay flows (explain, submit test, payment someday).

## Multi-tenant / B2B

- JWT carries optional **`tenantId`**; catalog listing/detail filter **platform tests** by tenant rules (see ROADMAP Phase 6). **Personal mocks** (`author_id = self`) still belong to the author.
- **Analytics / recommendations:** exclude institute-private or personal noise where the product rule says “platform catalog only” — typically **`author_id IS NULL`** (and tenant filters as implemented in `backend/src/routes/analytics.js`). Verify SQL when changing insights.

## Security & performance

- Passwords: follow existing **bcrypt** usage in auth routes.
- JWTs must **expire**; role-sensitive admin actions should match existing **DB role re-check** where implemented.
- Rate limits: respect global and route limiters (`explain`, auth). New public endpoints need explicit threat modeling.
- Frontend: memoize hot trees (palette, option lists) when profiling says so; debounce search-like inputs.

## Debugging order (when something breaks)

1. Env files (backend + frontend), especially `DATABASE_URL` typos and duplicate key lines.
2. **`GET /health`** — DB up? 503 vs 200.
3. CORS / `NEXT_PUBLIC_API_URL` — browser must call API origin, not Vercel-relative path.
4. Exact HTTP status + JSON `error` from failing `api()` call (Network tab or server logs with **request id**).

## Change discipline

- Touch **only** files required for the task; no drive-by reformat or unrelated refactors.
- Match existing naming, file placement, and patterns (imports, error handling, component structure).
- Cross-stack features: prefer **backend → frontend → manual sanity path** (start mock → answer → submit → results → explain if enabled).
- Ambiguous **exam rules** (retakes, timer grace, scoring edge cases) — **ask** or document in ROADMAP before coding the wrong behavior.

## Product filter

Push back on scope that does not improve **exam experience**, **result clarity**, **trust** (integrity, correctness), or **retention** — unless it fixes security, legal, or operational risk.

## Testing before you call it done

- `cd backend && npm test` when you changed API/DB behavior (needs `DATABASE_URL`).
- `cd frontend && npm run build` for non-trivial UI/type changes.
- For critical flows, trace **start → save answers → submit → results** (and explain job if touched).
- If you changed **public API** or **user-visible behavior**, update **`docs/ROADMAP.md`** (Changelog + Implemented/API sections) in the same PR when the team uses that contract.

## Absolute bar

Ship as if **candidates take a high-stakes mock this week**: predictable timer, honest scoring, clear errors, and no secret leakage. Reliability and clarity beat cleverness.

## Optional orchestration

For large ambiguous features spanning DB + API + UI + QA, use the workspace **meta orchestrator** agent to sequence specialists — this skill still applies to each slice.
