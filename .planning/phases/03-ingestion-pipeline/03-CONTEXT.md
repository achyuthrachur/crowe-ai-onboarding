# Phase 3: Ingestion Pipeline - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the ingestion pipeline: `scripts/ingest.ts` CLI script reads all 8 markdown docs from `/docs` (skips `00-PRD.md`), chunks them using the existing `chunker.ts`, batch-embeds via OpenAI `text-embedding-3-small`, upserts rows to `doc_chunks` (idempotent), then builds the IVFFlat index after all data is loaded. Also implements `/api/ingest` HTTP route for production re-ingestion, protected by `INGEST_SECRET`. Phase ends when `npm run ingest` runs cleanly and non-null embeddings are present in Neon.

</domain>

<decisions>
## Implementation Decisions

### npm run ingest Invocation
- tsx does NOT auto-load `.env.local` — this is a known constraint from Phase 2
- The npm script runs tsx directly: `"ingest": "NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/ingest.ts"`
- Env vars must be exported manually by the user before running:
  ```bash
  export $(grep -v '^#' .env.local | xargs) && npm run ingest
  ```
- This pattern is documented in README and in script comments — NOT built into the npm script itself
- `NODE_TLS_REJECT_UNAUTHORIZED=0` IS in the npm script (needed for OpenAI API calls on Crowe network at runtime)

### Terminal Output
- Per-doc progress: `"Ingesting 01-getting-started.md... 12 chunks"` for each doc
- Final summary: `"Ingested 87 chunks from 8 documents"`
- On error: `"Failed: 01-getting-started.md — [error message]"` included in final summary
- No chunk-level logging (too verbose)

### Error Handling
- Continue on per-doc failure — do NOT abort the whole script if one doc fails
- Continue with remaining docs, collect errors
- Report all failures in the final summary line: `"Ingested 75 chunks from 7 documents. Failed: [01-getting-started.md]"`
- IVFFlat index is built regardless of whether any docs failed (partial data is indexable; re-run fills gaps)

### Ingest Logic Architecture
- Extract core ingest logic into `src/lib/ingest.ts` — a shared module
- `scripts/ingest.ts` imports and calls the shared function (CLI entry point)
- `src/app/api/ingest/route.ts` imports and calls the same shared function (HTTP entry point)
- Single source of truth for chunking → embedding → upsert logic

### Embedding Batching
- Batch ALL chunks for a single doc in one `openai.embeddings.create({ input: [...] })` call
- Do NOT call embeddings API per-chunk (causes Vercel 10s timeout with 80+ sequential calls)
- One API call per doc (8 calls total for 8 docs) — acceptable latency

### Idempotency
- Before inserting chunks for a docId, DELETE existing rows: `DELETE FROM doc_chunks WHERE doc_id = $1`
- This makes re-runs safe — row count stays stable on repeat ingestion
- Delete + insert happens per-doc (not a global wipe before starting)

### IVFFlat Index
- Built AFTER all docs are inserted (not in schema migration — that's a critical ordering constraint)
- SQL: `CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx ON doc_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- This runs at the END of the ingest script, after all docs complete
- Also run at the end of the API route's full re-ingest (when no `docId` filter specified)

### /api/ingest Route Behavior
- Method: POST
- Auth: `x-ingest-secret` header must match `process.env.INGEST_SECRET`
- If `INGEST_SECRET` env var is missing/empty: return 500 with `{ error: "INGEST_SECRET not configured" }` — fail-closed
- If header missing or wrong: return 401 with `{ error: "Unauthorized" }`
- Success response: `{ ingested: number, docs: string[] }` — matches PRD spec
- Optional body: `{ "docId"?: string }` — if provided, re-ingest only that doc (skip index rebuild for single-doc updates)
- Route needs `export const maxDuration = 60` (Vercel Hobby plan 10s default is too short for embedding 80+ chunks)

### Claude's Discretion
- Exact TypeScript types for the shared ingest function signature
- Whether to add a `--doc` CLI flag to ingest a single doc (probably not needed for v1)
- Exact SQL for the DELETE + INSERT transaction (can use individual statements or a transaction)

</decisions>

<specifics>
## Specific Ideas

- The Vercel function timeout is a real risk — `export const maxDuration = 60` MUST be in the route file or production ingestion will time out at 10s
- `POSTGRES_URL_NON_POOLING` is used for all db operations in ingest (same as db.ts)
- The `docs/` folder files to process: `01-getting-started.md` through `08-resources.md` (skip `00-PRD.md` and any non-.md files)
- `docId` = filename without extension (e.g., `01-getting-started`)
- `docTitle` = first `# H1` heading found in the file

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/chunker.ts`: `chunkMarkdown(content, docId, docTitle)` → `Chunk[]` — use directly in ingest
- `src/lib/embeddings.ts`: `embedText(text: string)` → `Promise<number[]>` — single-text; ingest.ts needs a batch wrapper around this or direct use of `openai.embeddings.create({ input: string[] })`
- `src/lib/db.ts`: exports `sql` tagged template — use for all Neon queries

### Established Patterns
- All Neon queries use `sql` from `src/lib/db.ts` with `POSTGRES_URL_NON_POOLING`
- tsx env loading: `export $(grep -v '^#' .env.local | xargs) && NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx script.ts`
- Turbopack config already handles workspace root issues (from Phase 2 fix)

### Integration Points
- `src/lib/ingest.ts` → called by `scripts/ingest.ts` AND `src/app/api/ingest/route.ts`
- `doc_chunks` table → written here, read by Phase 4 chat API
- IVFFlat index → built here, queried by Phase 4 cosine search

</code_context>

<deferred>
## Deferred Ideas

- `--doc` CLI flag to ingest a single document — not needed for v1, ingest all or use API route with docId body
- Retry logic on OpenAI API failures — deferred; continue-on-error is sufficient for v1

</deferred>

---

*Phase: 03-ingestion-pipeline*
*Context gathered: 2026-03-07*
