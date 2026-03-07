---
phase: 04-chat-api
plan: 02
subsystem: api
tags: [openai, gpt-4o, rag, pgvector, nextjs, route-handler]

# Dependency graph
requires:
  - phase: 04-chat-api plan 01
    provides: retrieveChunks, condenseHistoryForRetrieval, truncateHistory, deduplicateSources from src/lib/retrieval.ts
  - phase: 03-ingestion-pipeline
    provides: doc_chunks table with IVFFlat index for pgvector cosine search
  - phase: 02-rag-app-scaffold
    provides: src/lib/embeddings.ts (embedText), src/lib/db.ts (sql)
provides:
  - POST /api/chat endpoint returning { reply: string, sources: { docId, docTitle, similarity }[] }
  - Full RAG pipeline: history condensation -> query embedding -> pgvector retrieval -> GPT-4o -> source dedup
  - Off-topic fallback that never calls GPT-4o when no chunks pass 0.3 similarity threshold
affects:
  - 05-chat-ui (POSTs to /api/chat, renders reply and sources)
  - Any phase adding features to chat (streaming, session storage, model switching)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - maxDuration=60 as first top-level export in route files (Vercel build-time read)
    - RAG pipeline orchestration in route.ts, pure helpers isolated in lib modules
    - OPENAI_MODEL env var pattern for zero-code model upgrades
    - Dynamic db.ts import inside async function body (prevents unit test breakage)

key-files:
  created:
    - src/app/api/chat/route.ts
  modified: []

key-decisions:
  - "Output field is reply (not answer) — matches REQUIREMENTS.md and Phase 5 contract"
  - "Fallback before GPT-4o call — empty context produces hallucinated answers, skip entirely"
  - "OPENAI_MODEL env var defaults to gpt-4o — swap models without code changes"
  - "System prompt verbatim from PRD — locked, not subject to executor discretion"

patterns-established:
  - "Route pattern: imports -> maxDuration export -> OpenAI client -> interfaces -> POST handler"
  - "RAG 8-step pipeline: condense history -> embed -> retrieve -> fallback check -> deduplicate -> truncate history -> build messages -> GPT-4o -> return"

requirements-completed: [CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08]

# Metrics
duration: 12min
completed: 2026-03-07
---

# Phase 4 Plan 02: Chat API Summary

**POST /api/chat RAG endpoint wiring pgvector retrieval to GPT-4o with history condensation, cosine similarity fallback, and deduplicated source citations**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-07T05:33:00Z
- **Completed:** 2026-03-07T07:17:00Z
- **Tasks:** 2 of 2 (checkpoint:human-verify approved)
- **Files modified:** 1

## Accomplishments
- Created `src/app/api/chat/route.ts` implementing the full 8-step RAG pipeline
- `export const maxDuration = 60` as first top-level export — Vercel Hobby plan override
- Fallback path skips GPT-4o entirely when no chunks pass 0.3 similarity threshold — no hallucinated answers
- Sources deduplicated by docId with highest similarity kept, sorted descending
- End-to-end verification passed: on-topic, off-topic fallback, and multi-turn history curl checks all confirmed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/app/api/chat/route.ts** - `33cc24c` (feat)
2. **Task 2: checkpoint:human-verify** - approved by user (all 3 curl checks + cosine comment inspection passed)

**Plan metadata:** (see final commit in this session)

## Files Created/Modified
- `src/app/api/chat/route.ts` - POST /api/chat RAG endpoint: history condensation, query embedding, pgvector retrieval, GPT-4o completion, source deduplication

## Decisions Made
- Output field named `reply` (not `answer`) — matches REQUIREMENTS.md and Phase 5 chat UI contract
- Fallback check placed before GPT-4o call — calling GPT-4o on empty context produces hallucinated answers
- `OPENAI_MODEL ?? 'gpt-4o'` pattern — configurable without code changes
- System prompt used verbatim from PRD — locked specification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan (OPENAI_API_KEY already configured from Phase 1).

## Next Phase Readiness
- POST /api/chat endpoint ready for Phase 5 chat UI
- Endpoint is fully stateless — Phase 5 maintains history in React client state
- Sources return `{ docId, docTitle, similarity }` — Phase 5 decides how to render links
- All 14 unit tests passing, TypeScript clean, end-to-end behavior verified

## Self-Check: PASSED

- `src/app/api/chat/route.ts` — FOUND
- Task 1 commit `33cc24c` — FOUND
- 14 unit tests — PASSING
- TypeScript — CLEAN (zero errors)

---
*Phase: 04-chat-api*
*Completed: 2026-03-07*
