---
phase: 03-ingestion-pipeline
plan: 01
subsystem: database
tags: [openai, pgvector, ivfflat, embeddings, markdown, neon, postgresql]

# Dependency graph
requires:
  - phase: 02-rag-app-scaffold
    provides: chunker.ts (chunkMarkdown), db.ts (sql tagged template), doc_chunks table schema
provides:
  - src/lib/ingest.ts with IngestResult, IngestError, IngestSummary interfaces
  - ingestDoc(filePath) — single-doc pipeline: read → chunk → batch embed → DELETE+INSERT
  - ingestAll(docsDir) — multi-doc pipeline with error collection and IVFFlat index build
affects: [03-02-cli-script, 03-03-http-route, 04-rag-query-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch embedding pattern (one openai.embeddings.create call per doc, not per chunk)
    - Idempotent delete-before-insert for stable row counts on re-run
    - IVFFlat index built post-ingestion (not in migration schema)
    - JSON.stringify(embedding)::vector cast for pgvector compatibility with @neondatabase/serverless
    - Continue-on-error pattern in ingestAll (collect errors without aborting)

key-files:
  created:
    - src/lib/ingest.ts
  modified: []

key-decisions:
  - "Batch embedding: one openai.embeddings.create({ input: string[] }) call per doc — avoids rate limits and Vercel timeout"
  - "No sql.transaction() — uncertain API in @neondatabase/serverless ^1.0.2; use sequential awaits instead"
  - "IVFFlat index created in ingestAll after all inserts complete — pre-data index is silently useless"
  - "SKIP_FILES set includes CLAUDE.md and DESIGN.md as defensive guards beyond just 00-PRD.md"
  - "console.log inside ingestDoc (not CLI wrapper) so HTTP route also emits progress to Vercel logs"

patterns-established:
  - "Pattern 1: Shared ingest module — business logic lives in src/lib/ingest.ts; CLI and HTTP route handle only I/O"
  - "Pattern 2: Vector cast — always use JSON.stringify(array)::vector, never pass number[] directly"
  - "Pattern 3: Idempotency — DELETE WHERE doc_id = ${docId} before any INSERT in ingestDoc"

requirements-completed: [INGS-01, INGS-02, INGS-03, INGS-04, INGS-07]

# Metrics
duration: 1min
completed: 2026-03-07
---

# Phase 03 Plan 01: Ingest Module Summary

**Shared ingestion module with batch OpenAI embeddings, idempotent DELETE+INSERT, and post-data IVFFlat index build using @neondatabase/serverless sql tagged template**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-07T04:19:31Z
- **Completed:** 2026-03-07T04:20:37Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments
- Created `src/lib/ingest.ts` — the single source of truth for the full ingestion pipeline
- `ingestDoc` reads a markdown file, chunks it via `chunkMarkdown`, batch-embeds all chunks in one OpenAI API call, deletes existing doc rows, and inserts new rows with `JSON.stringify(embedding)::vector` cast
- `ingestAll` processes all `.md` files in a directory (skipping `00-PRD.md`, `CLAUDE.md`, `DESIGN.md`), collects per-doc errors without aborting, and builds the IVFFlat cosine index after all inserts complete
- TypeScript compiles cleanly (`npx tsc --noEmit` passes with zero errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/lib/ingest.ts** - `90726be` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/lib/ingest.ts` - Shared ingestion module exported by CLI script and HTTP route; exports IngestResult, IngestError, IngestSummary interfaces plus ingestDoc/ingestAll functions

## Decisions Made
- Batch embedding pattern: one `openai.embeddings.create({ input: string[] })` call per doc (not per chunk) to avoid rate limits and Vercel timeouts
- No `sql.transaction()` — API is uncertain in `@neondatabase/serverless ^1.0.2`; sequential `await sql` used instead
- IVFFlat index (`CREATE INDEX IF NOT EXISTS`) placed at end of `ingestAll` — building before data exists is silently useless
- `console.log` placed inside `ingestDoc` (not in the CLI wrapper) so the HTTP route also emits per-doc progress to Vercel logs
- SKIP_FILES defensively includes `CLAUDE.md` and `DESIGN.md` beyond the primary `00-PRD.md` exclusion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this module. Callers must have `OPENAI_API_KEY` and `POSTGRES_URL_NON_POOLING` set in environment before importing.

## Next Phase Readiness
- `src/lib/ingest.ts` is fully ready to be imported by Plan 02 (CLI script: `scripts/ingest.ts`) and Plan 03 (HTTP route: `src/app/api/ingest/route.ts`)
- Both entry points will only need to handle their I/O concerns — all business logic lives in this module

## Self-Check: PASSED

- `src/lib/ingest.ts` — FOUND
- Commit `90726be` — FOUND
- `03-01-SUMMARY.md` — FOUND

---
*Phase: 03-ingestion-pipeline*
*Completed: 2026-03-07*
