---
phase: 03-ingestion-pipeline
plan: 03
subsystem: api
tags: [nextjs, api-route, auth, openai, ingestion, vercel]

# Dependency graph
requires:
  - phase: 03-ingestion-pipeline plan 01
    provides: ingestDoc and ingestAll functions from src/lib/ingest.ts

provides:
  - POST /api/ingest HTTP endpoint with x-ingest-secret header auth
  - Fail-closed auth (500 on missing INGEST_SECRET, 401 on wrong/absent header)
  - Vercel timeout extension via top-level maxDuration = 60 export
  - Single-doc re-ingest path via optional {docId} body param

affects: [04-rag-query-pipeline, future-maintenance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-closed auth: check env var presence before header comparison so misconfiguration returns 500 not 401"
    - "Top-level maxDuration export for Vercel Hobby plan timeout extension (must be outside handler)"
    - "Optional body param pattern: request.json().catch(() => ({})) for safe empty-body handling"

key-files:
  created:
    - src/app/api/ingest/route.ts
  modified:
    - package.json (ingest script staged from 03-02, committed here)

key-decisions:
  - "maxDuration = 60 must be a top-level named export — Vercel reads it at build time; inside the handler it is silently ignored"
  - "Fail-closed order: check INGEST_SECRET existence first (500), then header match (401) — avoids leaking that a secret exists when env is misconfigured"
  - "No try/catch around ingestAll — individual doc failures are already collected internally; ingestAll should not throw"
  - "Single-doc path skips IVFFlat index rebuild — index already exists after initial full ingest"

patterns-established:
  - "Pattern: HTTP route delegates entirely to shared lib module — route.ts is auth+routing only, no business logic"

requirements-completed: [INGS-06]

# Metrics
duration: 8min
completed: 2026-03-06
---

# Phase 3 Plan 03: Ingest HTTP Route Summary

**POST /api/ingest with fail-closed x-ingest-secret auth, Vercel 60s timeout extension, and optional single-doc re-ingest via {docId} body**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-06T00:00:00Z
- **Completed:** 2026-03-06T00:08:00Z
- **Tasks:** 1 of 2 (Task 2 is a human-verify checkpoint — awaiting verification)
- **Files modified:** 2

## Accomplishments

- HTTP POST endpoint at `/api/ingest` delegates auth + routing to route.ts, business logic to src/lib/ingest.ts
- Fail-closed auth pattern: missing/empty INGEST_SECRET → 500, wrong/absent x-ingest-secret header → 401
- Vercel Hobby plan timeout extended from 10s to 60s via top-level `export const maxDuration = 60`
- Optional `{docId}` body enables single-doc re-ingest (skips IVFFlat rebuild, faster for doc updates)
- TypeScript clean — `npx tsc --noEmit` passes with no errors

## Task Commits

1. **Task 1: Create src/app/api/ingest/route.ts** - `4f83758` (feat)

## Files Created/Modified

- `src/app/api/ingest/route.ts` - HTTP POST endpoint; fail-closed INGEST_SECRET auth; delegates to ingestDoc/ingestAll from @/lib/ingest
- `package.json` - `npm run ingest` script added (NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/ingest.ts), committed here after being staged in 03-02

## Decisions Made

- `maxDuration = 60` is a top-level named export — Vercel reads it at build time, not at runtime. Placing it inside the handler silently disables the timeout extension.
- Fail-closed ordering: env var check (500) before header check (401) — if INGEST_SECRET is not configured the server shouldn't reveal whether the header was right or wrong.
- No try/catch around `ingestAll` — the function already collects per-doc errors internally and will not throw.
- Single-doc path skips IVFFlat rebuild — the index persists between ingests; no need to rebuild when updating one document.

## Deviations from Plan

None — plan executed exactly as written. Used `@/lib/ingest` import (confirmed `@/*` → `./src/*` alias in tsconfig.json).

## Issues Encountered

None.

## User Setup Required

None — no new external service configuration required for this plan. INGEST_SECRET must be present in `.env.local` (added in Phase 1) and in Vercel dashboard for the HTTP route to function.

## Next Phase Readiness

- Phase 3 ingestion pipeline is complete (Plans 01, 02, 03 all done)
- Human verification checkpoint (Task 2) awaits: TypeScript check, CLI run against live Neon DB, SQL queries, idempotency check, curl auth checks
- Once checkpoint passes, Phase 4 (RAG query pipeline) can proceed
- The ingest HTTP route is ready for production use after Vercel deploy

---
*Phase: 03-ingestion-pipeline*
*Completed: 2026-03-06*
