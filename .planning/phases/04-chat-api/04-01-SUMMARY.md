---
phase: 04-chat-api
plan: 01
subsystem: testing
tags: [vitest, pgvector, retrieval, cosine-similarity, unit-tests]

# Dependency graph
requires:
  - phase: 03-ingestion-pipeline
    provides: doc_chunks table with pgvector embeddings and sql usage pattern

provides:
  - Vitest test infrastructure (vitest.config.ts, npm test script)
  - src/lib/retrieval.ts with retrieveChunks (pgvector cosine similarity) and 3 pure helpers
  - src/lib/retrieval.test.ts with 14 passing unit tests for pure helpers
  - OPENAI_MODEL documented in .env.example

affects: [04-chat-api plan 02 (chat route imports retrieveChunks and helpers)]

# Tech tracking
tech-stack:
  added: [vitest@4, @vitejs/plugin-react]
  patterns:
    - Dynamic import of db.ts inside retrieveChunks to avoid module-load-time env var check
    - Cosine similarity via 1 - (<=> cosine distance) with 0.3 similarity threshold
    - TDD RED-GREEN: write failing test file first, then implement

key-files:
  created:
    - vitest.config.ts
    - src/lib/retrieval.ts
    - src/lib/retrieval.test.ts
  modified:
    - package.json (added test and test:watch scripts)
    - .env.example (added OPENAI_MODEL entry)

key-decisions:
  - "Dynamic import of db.ts inside retrieveChunks — db.ts throws at module load when POSTGRES_URL_NON_POOLING is missing; lazy import ensures pure helpers are unit-testable without a DB connection"
  - "1 - (embedding <=> ...)::vector pattern — pgvector <=> is cosine distance not similarity; explicit ::vector cast required for @neondatabase/serverless"

patterns-established:
  - "Pattern 1: Pure functions exported alongside async DB functions in retrieval modules — enables unit testing without infrastructure"
  - "Pattern 2: db.ts lazy-imported inside async DB functions — prevents module evaluation failures in unit test environments"

requirements-completed: [CHAT-03, CHAT-04, CHAT-05, CHAT-06]

# Metrics
duration: 3min
completed: 2026-03-07
---

# Phase 4 Plan 01: Retrieval Module and Vitest Infrastructure Summary

**Vitest installed with 14 passing unit tests for pgvector cosine retrieval helpers (condense, truncate, deduplicate) and retrieval.ts exporting retrieveChunks with 1-distance similarity pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T05:38:23Z
- **Completed:** 2026-03-07T05:41:34Z
- **Tasks:** 2 (Task 1: Vitest setup; Task 2: TDD RED+GREEN)
- **Files modified:** 5

## Accomplishments

- Vitest 4 installed as dev dependency; `npm test` runs all unit tests
- `src/lib/retrieval.ts` exports `RetrievedChunk`, `retrieveChunks`, `condenseHistoryForRetrieval`, `truncateHistory`, `deduplicateSources`
- 14/14 unit tests pass covering all specified behavior cases across 3 pure helper functions
- Cosine distance comment visible in retrieval.ts source explaining the `<=>` operator

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vitest and create test infrastructure** - `c426a96` (chore)
2. **Task 2 RED: Failing tests for retrieval pure helpers** - `1e22a90` (test)
3. **Task 2 GREEN: Implement retrieval.ts** - `9a324ab` (feat)

_Note: TDD task split into RED (test) and GREEN (feat) commits as per TDD protocol_

## Files Created/Modified

- `vitest.config.ts` - Vitest config with node environment
- `src/lib/retrieval.ts` - retrieveChunks (pgvector query) + 3 pure helpers + RetrievedChunk interface
- `src/lib/retrieval.test.ts` - 14 unit tests for condenseHistoryForRetrieval, truncateHistory, deduplicateSources
- `package.json` - Added `test` (vitest run) and `test:watch` (vitest) scripts
- `.env.example` - Added OPENAI_MODEL=gpt-4o entry with comment

## Decisions Made

- **Dynamic import of db.ts inside retrieveChunks:** `db.ts` throws an error at module load time when `POSTGRES_URL_NON_POOLING` is not set. A top-level `import { sql } from './db'` would prevent the pure helper tests from running without a DB connection. Resolved by using `const { sql } = await import('./db')` inside the async function body — the import is deferred to call time, not module evaluation.

- **Kept `JSON.stringify(embedding)::vector` pattern:** Matches the established pattern from `ingest.ts` line 83. The `@neondatabase/serverless` sql tag does not auto-cast `number[]` to pgvector's `vector` type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lazy import of db.ts to prevent module-load-time env var failure**
- **Found during:** Task 2 GREEN phase (first test run)
- **Issue:** `retrieval.ts` imported `db.ts` at the top level. `db.ts` throws `Error: POSTGRES_URL_NON_POOLING environment variable is not set` at module evaluation time. This caused the entire test suite to fail with no tests running — the pure helper tests never executed.
- **Fix:** Changed `import { sql } from './db'` to `const { sql } = await import('./db')` inside the `retrieveChunks` function body. The DB module is now only evaluated when `retrieveChunks` is actually called (which requires a live DB).
- **Files modified:** `src/lib/retrieval.ts`
- **Verification:** All 14 unit tests pass after the change; `npx vitest run` exits 0
- **Committed in:** `9a324ab` (GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug: module-load-time env var throw blocked tests)
**Impact on plan:** Necessary correctness fix. The plan stated "Pure functions are unit-tested without mocking the database" — this fix enables exactly that. No scope creep.

## Issues Encountered

- Top-level db.ts import caused all tests to fail — resolved via lazy import as documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `retrieveChunks` is ready to import in the chat route (`src/app/api/chat/route.ts`)
- `condenseHistoryForRetrieval`, `truncateHistory`, `deduplicateSources` are ready to use in route logic
- `npm test` passes clean — test infrastructure ready for any additional tests in Phase 4 Plan 02
- `OPENAI_MODEL` env var documented; route can read `process.env.OPENAI_MODEL ?? 'gpt-4o'`

---
*Phase: 04-chat-api*
*Completed: 2026-03-07*
