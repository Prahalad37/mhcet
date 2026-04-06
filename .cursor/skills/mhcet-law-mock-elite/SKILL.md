---
name: mhcet-law-mock-elite
description: Production-grade workflow for the MHCET Law exam mock (Next.js 3000, Express 4000, Postgres 5432). Verifies APIs and migrations before coding; enforces secrets in backend/.env only; Zod validation, HttpError, parameterized SQL, server-authoritative timer and scoring, immutable attempts, explanation payloads. Use when implementing or reviewing features in this repo, hardening the test engine, or aligning changes with exam UX and retention.
---

# MHCET Law Mock — elite production discipline

**Companion:** Repo-wide conventions live in `.cursor/rules/mhcet-production.mdc`. Read that for stack/env/DB/API specifics; this skill adds **domain rules**, **workflow**, and **completion bar**.

## Stance

Act as a senior production engineer and product thinker. Optimize for correctness, performance, maintainability, and user/business impact. Ship **deployable** code, not demos.

## System awareness (before coding)

- Assume ports: frontend **3000**, API **4000**, Postgres **5432** (see `README.md` for running both processes).
- **Do not assume** endpoints or payloads exist: read routes/handlers and `frontend/lib/api.ts`.
- **Do not assume** schema: read `backend/src/db/migrations/` and relevant queries.
- **Never break** existing API contracts without an explicit migration/versioning plan.

## Environment and secrets

- Secrets only in `backend/.env`: `JWT_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY`.
- `frontend/.env.local` — **public** config only (e.g. `NEXT_PUBLIC_API_URL`). **Never** `NEXT_PUBLIC_*` for OpenAI or any secret.
- If required env is missing for the task, **stop** and surface a clear error; do not invent placeholders that hide misconfiguration.

## Database

- **Parameterized queries only** (`$1`, `$2`, …). No string-interpolated SQL for user-controlled values.
- Use **transactions** when multiple writes must succeed or fail together.
- New schema: **new** file under `backend/src/db/migrations/`; run `cd backend && npm run migrate`. **Do not edit** already-applied migrations unless the team resets deliberately.

## API design

- Validate input with **Zod**; predictable errors via **`HttpError`** and centralized **`errorHandler`** (see `mhcet-production.mdc` for paths).
- Prefer a **consistent JSON shape** the codebase already uses, for example success vs error envelopes (match existing handlers; do not introduce a second pattern in the same surface).
- **Never** leak stack traces or internal details to the client. **Never** log tokens, passwords, `Authorization`, or `OPENAI_API_KEY`.

## Domain — exam simulation (MHCET Law)

This is an **exam simulation**, not a generic CRUD app.

- **Timer:** Accuracy matters. Auto-submit behavior must be correct; **time limits must be enforced server-side** (e.g. reject or finalize when `now` exceeds allowed window from authoritative `start` + `duration`). Do not rely only on the browser clock for security.
- **Scoring:** Compute scores **only on the backend**. Never trust the client for final answers or totals.
- **Attempts:** After submit, treat attempt data as **immutable**. Prevent **double submission** and **overwrite** of completed attempts.
- **Negative marking:** **None** — do not introduce negative-mark logic unless product explicitly changes.
- Persist per-question facts the results view needs, e.g. `correct_answer`, `selected_answer`, `is_correct` (names may match existing columns — follow the schema).

## Explanations

- Support **static** explanation from the DB even when AI is off.
- When returning structured explanation-friendly fields, align with existing API/models; a useful shape to aim for when extending:

```json
{
  "answer": "",
  "explanation": "",
  "concept": "",
  "example": ""
}
```

- AI path stays server-side (`backend/src/services/explainService.js`); never expose API keys to the client.

## Frontend

- **No hardcoded API origins**; use `NEXT_PUBLIC_API_URL` and shared client code (`frontend/lib/api.ts`).
- UX: **loading**, **error**, and **empty** states; **disable** buttons while in-flight; avoid duplicate submits (AbortController / idempotent UX where appropriate).

## Security and performance

- Passwords: **bcrypt** (or existing project standard — follow current auth code).
- JWTs must have **expiry**; never log tokens.
- Avoid unnecessary re-renders; use memoization where it clearly pays; debounce noisy handlers (search, resize) when adding new UI.

## Debugging order

When something fails, trace rather than guess:

1. Env (backend `.env`, frontend `.env.local`, typo/duplicate `DATABASE_URL` line)
2. API process up (`/health` or known route)
3. DB connectivity
4. Actual HTTP status and response body from the failing call

## Change and delivery discipline

- Touch **only** files needed for the task; no drive-by refactors or unrelated formatting.
- Match existing naming and patterns in the repo.
- Prefer incremental delivery: **backend → frontend → integration**, especially for cross-cutting features. If requirements are ambiguous on product behavior (timer, scoring, retakes), **ask** before encoding wrong rules.
- **Product filter:** Reject or push back on scope that does not clearly improve **test experience**, **result clarity**, or **retention** (unless it is required for correctness/security).

## Before marking work done

- Code compiles / typechecks as expected for touched packages.
- API and app run without new avoidable console errors; no stray undefineds in new paths.
- If the feature is user-facing, sanity-check the critical path (start test → answer → submit → results) mentally or by running locally.

## Absolute bar

Build as if **real users ship in seven days**: reliability and clarity over cleverness.
