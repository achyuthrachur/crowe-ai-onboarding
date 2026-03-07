# Phase 3: Ingestion Pipeline - Research

**Researched:** 2026-03-07
**Domain:** Node.js CLI script + Next.js API route + pgvector batch upsert + OpenAI batch embeddings
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- tsx does NOT auto-load `.env.local` — env vars must be exported manually before running
- npm script: `"ingest": "NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/ingest.ts"` — exact form, no dotenv loader built in
- Env export pattern documented in README and script comments: `export $(grep -v '^#' .env.local | xargs) && npm run ingest`
- `NODE_TLS_REJECT_UNAUTHORIZED=0` IS in the npm script (needed for OpenAI API calls at runtime on Crowe network)
- Per-doc progress: `"Ingesting 01-getting-started.md... 12 chunks"`
- Final summary: `"Ingested 87 chunks from 8 documents"`
- On error: `"Failed: 01-getting-started.md — [error message]"` included in summary line
- No chunk-level logging
- Continue on per-doc failure — never abort entire script
- Collect all errors, report in final summary: `"Ingested 75 chunks from 7 documents. Failed: [01-getting-started.md]"`
- IVFFlat index built regardless of whether any docs failed
- Core ingest logic in `src/lib/ingest.ts` (shared module)
- `scripts/ingest.ts` = CLI entry point (imports shared module)
- `src/app/api/ingest/route.ts` = HTTP entry point (imports shared module)
- Batch ALL chunks for a single doc in one `openai.embeddings.create({ input: [...] })` call
- One API call per doc (8 calls total) — NOT per-chunk
- Idempotency: `DELETE FROM doc_chunks WHERE doc_id = $1` before inserting chunks for that docId
- IVFFlat SQL (exact): `CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx ON doc_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- IVFFlat built AFTER all docs inserted, at the END of the ingest script
- Also run at end of API route when no `docId` filter specified (full re-ingest only)
- `/api/ingest`: POST, `x-ingest-secret` header auth
- If `INGEST_SECRET` env var missing/empty: return 500 `{ error: "INGEST_SECRET not configured" }` — fail-closed
- If header missing or wrong: return 401 `{ error: "Unauthorized" }`
- Success response: `{ ingested: number, docs: string[] }`
- Optional body `{ "docId"?: string }` — re-ingest single doc only; skip index rebuild for single-doc updates
- `export const maxDuration = 60` required in route file
- `POSTGRES_URL_NON_POOLING` used throughout (never `DATABASE_URL`)
- `docId` = filename without extension (e.g., `01-getting-started`)
- `docTitle` = first `# H1` heading found in the file

### Claude's Discretion

- Exact TypeScript types for the shared ingest function signature
- Whether to add a `--doc` CLI flag to ingest a single doc (probably not needed for v1)
- Exact SQL for the DELETE + INSERT (can use individual statements or a transaction)

### Deferred Ideas (OUT OF SCOPE)

- `--doc` CLI flag to ingest a single document — not needed for v1
- Retry logic on OpenAI API failures — continue-on-error is sufficient for v1

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INGS-01 | `scripts/ingest.ts` CLI — reads .md files from `/docs` (skips `00-PRD.md`), chunks, batch-embeds, upserts to pgvector | File enumeration pattern, shared module import, fs.readdirSync usage |
| INGS-02 | Embedding calls are batched — single `openai.embeddings.create({ input: [...] })` per doc | OpenAI SDK batch input pattern; response shape `response.data[i].embedding` |
| INGS-03 | Ingestion is idempotent — deletes existing rows for a `docId` before re-inserting | `@neondatabase/serverless` tagged-template DELETE pattern; per-doc delete verified |
| INGS-04 | IVFFlat index (`vector_cosine_ops`, `lists=100`) created after all rows inserted | Must execute AFTER data load; `CREATE INDEX IF NOT EXISTS` is idempotent |
| INGS-05 | `npm run ingest` defined in `package.json` | Exact script string confirmed; env-export workflow documented |
| INGS-06 | `/api/ingest` POST endpoint protected by `x-ingest-secret`; fail-closed | Next.js App Router Route Handler pattern; `export const maxDuration = 60` |
| INGS-07 | Successful ingest populates DB with non-null embeddings (verifiable) | SQL verification queries documented; vector_dims() function confirmed |

</phase_requirements>

---

## Summary

Phase 3 builds the data pipeline that feeds the entire RAG system. It has two entry points (CLI and HTTP) that share a single `src/lib/ingest.ts` module. The pipeline is: read markdown files from `docs/` → chunk via existing `chunker.ts` → batch embed via OpenAI → upsert to Neon → build IVFFlat index. All decisions are fully locked from Phase 3 CONTEXT.md.

The key technical risks are (1) ordering: IVFFlat must be created after data exists or it will be silently useless; (2) batching: one `openai.embeddings.create` per doc, not per chunk, to avoid both rate-limit exhaustion and Vercel's 10-second function timeout; (3) the `@neondatabase/serverless` `sql` tagged template requires array parameters to be passed as explicit SQL arrays when inserting vectors — the embedding must be formatted as a PostgreSQL array literal string. The `POSTGRES_URL_NON_POOLING` connection used in `db.ts` is session-level and compatible with pgvector; `DATABASE_URL` routes through PgBouncer and breaks pgvector session state.

**Primary recommendation:** Implement `src/lib/ingest.ts` as the shared core, with `ingestDoc(docId, filePath)` and `ingestAll(docsDir)` exports. The CLI calls `ingestAll`; the API route calls either `ingestDoc` (single docId body) or `ingestAll` (no body). TypeScript types are fully inferrable from the existing `Chunk` interface in `chunker.ts` and the `sql` tag from `db.ts`.

---

## Standard Stack

### Core (all already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@neondatabase/serverless` | ^1.0.2 | Neon Postgres client with `sql` tag | Already in use in `db.ts`; non-pooling connection required for pgvector |
| `openai` | ^6.27.0 | Batch embeddings via `text-embedding-3-small` | Already in use in `embeddings.ts` |
| `tsx` | ^4.21.0 (devDep) | Run TypeScript CLI scripts without build step | Already used for `scripts/migrate.ts` |
| `fs` (Node built-in) | — | Read docs directory and file contents | No install needed |
| `path` (Node built-in) | — | Resolve file paths portably | No install needed |

### No new dependencies required

All libraries needed for Phase 3 are already present in `package.json`. The ingest script uses the same `sql` export from `src/lib/db.ts` and the same `OpenAI` client pattern as `src/lib/embeddings.ts`.

**Installation:** None required.

---

## Architecture Patterns

### Recommended File Structure

```
src/
└── lib/
    └── ingest.ts        # Shared core: ingestDoc() + ingestAll()
scripts/
└── ingest.ts            # CLI entry point: calls ingestAll(), logs, exits
src/app/api/ingest/
└── route.ts             # Next.js Route Handler: auth, calls ingestDoc or ingestAll
```

### Pattern 1: Shared Ingest Module with Two Entry Points

**What:** All chunking, embedding, and upsert logic lives in `src/lib/ingest.ts`. Neither the CLI script nor the API route contains business logic — they only handle their respective I/O concerns (console output vs HTTP response).

**When to use:** Whenever the same operation must be triggerable from both a script and an API route. Avoids logic duplication and ensures both paths stay in sync.

**TypeScript function signatures (Claude's discretion — recommended):**

```typescript
// src/lib/ingest.ts

import { sql } from './db';
import { chunkMarkdown } from './chunker';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface IngestResult {
  docId: string;
  docTitle: string;
  chunksIngested: number;
}

export interface IngestError {
  docId: string;
  error: string;
}

export interface IngestSummary {
  results: IngestResult[];
  errors: IngestError[];
  totalChunks: number;
}

// Ingest a single document by file path.
// Idempotent: deletes existing rows for docId before inserting.
export async function ingestDoc(filePath: string): Promise<IngestResult>;

// Ingest all docs in a directory (skips 00-PRD.md and non-.md files).
// Builds IVFFlat index after all docs complete.
// Continue-on-error: collects failures without aborting.
export async function ingestAll(docsDir: string): Promise<IngestSummary>;
```

**Rationale for `ingestDoc` taking `filePath` (not `docId`):** The file path is the single source of truth — `docId` and `docTitle` are derived from it inside the function. This avoids callers needing to construct both.

### Pattern 2: H1 Heading Extraction for docTitle

**What:** Parse the first `# Heading` line from the markdown content to use as `docTitle`.

**Implementation (simple regex — no markdown parser needed):**

```typescript
function extractDocTitle(content: string, fallback: string): string {
  const match = content.match(/^# (.+)$/m);
  return match ? match[1].trim() : fallback;
}
```

**Confirmed H1 headings for all 8 docs (verified by reading files directly):**

| File | docId | docTitle |
|------|-------|---------|
| `01-getting-started.md` | `01-getting-started` | Getting Started on the Crowe AI Practice |
| `02-stack-overview.md` | `02-stack-overview` | The Stack — What We Use and Why |
| `03-ui-libraries.md` | `03-ui-libraries` | UI Libraries — What to Use and When |
| `04-branding-guide.md` | `04-branding-guide` | Crowe Brand Guide |
| `05-vercel-deployment.md` | `05-vercel-deployment` | Deploying to Vercel |
| `06-project-patterns.md` | `06-project-patterns` | Project Patterns |
| `07-workflow-guide.md` | `07-workflow-guide` | Workflow Guide — How We Build |
| `08-resources.md` | `08-resources` | Resource Directory |

All 8 docs have H1 headings. The fallback (filename without extension) is only needed defensively.

### Pattern 3: Batch Embedding for a Single Doc

**What:** Collect all chunk content strings for one doc, pass as `input` array to a single `openai.embeddings.create` call, then map `response.data[i].embedding` back to chunks by index.

**OpenAI SDK v6 batch pattern:**

```typescript
// Source: openai npm package (installed at ^6.27.0)
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunks.map(c => c.content),  // string[]
});
// response.data is an array ordered to match input
// response.data[i].embedding is number[] of length 1536
const embeddings: number[][] = response.data.map(d => d.embedding);
```

**Critical ordering guarantee:** The OpenAI API guarantees that `response.data` is returned in the same order as the `input` array. Index alignment is safe.

### Pattern 4: Neon Serverless Vector Upsert (DELETE + INSERT)

**What:** For idempotency, delete all existing chunks for a `docId` then insert new ones. Individual statements (not a transaction) are acceptable for this use case since partial failure per doc is tolerable (continue-on-error policy).

**Neon `sql` tagged template patterns:**

```typescript
// Source: @neondatabase/serverless (installed at ^1.0.2), db.ts pattern
import { sql } from '../lib/db';

// DELETE existing rows for doc
await sql`DELETE FROM doc_chunks WHERE doc_id = ${docId}`;

// INSERT a single chunk with embedding
// The embedding (number[]) must be cast via ::vector in the SQL
await sql`
  INSERT INTO doc_chunks (doc_id, doc_title, chunk_index, content, embedding)
  VALUES (
    ${chunk.docId},
    ${chunk.docTitle},
    ${chunk.chunkIndex},
    ${chunk.content},
    ${JSON.stringify(embedding)}::vector
  )
`;
```

**Important: `@neondatabase/serverless` vector insertion pattern:**

The `sql` tagged template does NOT automatically serialize `number[]` as a PostgreSQL vector literal. The correct approach is to stringify the array with `JSON.stringify(embedding)` (produces `[0.1, 0.2, ...]`) then cast it `::vector`. This is the established pattern for Neon + pgvector.

**Bulk insert alternative (better performance for 10+ rows):**

```typescript
// Insert all chunks for one doc in a single round-trip
// Build a VALUES list with positional parameters
// Note: Neon's sql tag does not support dynamic multi-row VALUES natively
// Simplest correct approach: one INSERT per chunk in a for loop (8 docs × ~12 chunks = ~96 round-trips — acceptable)
// OR: use sql.transaction() for atomic multi-row insert
```

For this project (~80–100 total chunks across 8 docs), per-chunk inserts in a loop are acceptable. Neon's HTTP transport handles each tagged-template call as a separate HTTP request; latency is low.

**Transaction approach (Claude's discretion — recommended for atomicity per doc):**

```typescript
// @neondatabase/serverless supports transaction() for batching
// This ensures DELETE + all INSERTs for a doc are atomic
// Prevents partial doc state on failure mid-insert
await sql.transaction([
  sql`DELETE FROM doc_chunks WHERE doc_id = ${docId}`,
  ...chunks.map((chunk, i) =>
    sql`INSERT INTO doc_chunks (doc_id, doc_title, chunk_index, content, embedding)
        VALUES (${chunk.docId}, ${chunk.docTitle}, ${chunk.chunkIndex}, ${chunk.content},
                ${JSON.stringify(embeddings[i])}::vector)`
  ),
]);
```

**IMPORTANT: `@neondatabase/serverless` transaction() API note:** The `neon()` function returns a tagged-template query function. The `transaction()` method is available on the `neon()` result. Verify the exact API in the installed version (^1.0.2) — it may be `sql.transaction(queries[])` or require `neonConfig` with `fetchConnectionCache`. Use individual sequential awaits if transaction() API is uncertain.

### Pattern 5: IVFFlat Index After Ingestion

**What:** Create the IVFFlat index only after all data rows exist, using `CREATE INDEX IF NOT EXISTS` for idempotency.

```typescript
// Exact SQL from CONTEXT.md (locked decision)
await sql`
  CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx
  ON doc_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
`;
```

**Why `lists = 100`:** IVFFlat performance guideline is `lists = sqrt(rows)`. With ~100 rows, `lists = 100` is appropriate. For < 1000 rows, IVFFlat provides marginal speed gain but is required for correctness of cosine similarity search in Phase 4.

**Timing:** This SQL runs at the END of `ingestAll()`, after all doc inserts complete, including when some docs failed. If the table is empty (all docs failed), the index still creates — it is harmless on an empty table.

### Pattern 6: Next.js App Router Route Handler

**What:** `src/app/api/ingest/route.ts` as a Next.js App Router API route with POST handler, auth check, and Vercel timeout extension.

```typescript
// src/app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { ingestDoc, ingestAll } from '@/lib/ingest';

export const maxDuration = 60;  // MUST be top-level export; extends Vercel timeout to 60s

export async function POST(request: NextRequest) {
  // Fail-closed: if INGEST_SECRET is not configured, refuse entirely
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'INGEST_SECRET not configured' }, { status: 500 });
  }

  const provided = request.headers.get('x-ingest-secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Optional body: { docId?: string }
  const body = await request.json().catch(() => ({}));
  const { docId } = body as { docId?: string };

  // ... call ingestDoc or ingestAll, return { ingested, docs }
}
```

**`maxDuration = 60` placement:** Must be a top-level named export in the route file — NOT inside the handler function. Next.js/Vercel reads it at build time. This is a Vercel constraint; the Hobby plan default is 10s which will time out on 8-doc ingestion.

### Anti-Patterns to Avoid

- **Per-chunk embedding calls:** Calling `openai.embeddings.create` for each of ~100 chunks = ~100 HTTP calls, triggers rate limits, and will exceed any function timeout. Always batch per-doc.
- **IVFFlat in schema migration:** Creating the index before data exists means it builds on an empty table and provides no benefit. All writes then pay index maintenance overhead before any reads. Locked decision: index in ingest, not migrate.
- **Using `DATABASE_URL` instead of `POSTGRES_URL_NON_POOLING`:** `DATABASE_URL` routes through PgBouncer. PgBouncer breaks pgvector session state. Only `POSTGRES_URL_NON_POOLING` works correctly with pgvector operations.
- **Passing `number[]` directly to Neon sql tag as a vector:** Neon does not auto-cast JS arrays to PostgreSQL `vector` type. Must use `${JSON.stringify(embedding)}::vector`.
- **Hardcoding `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env.local` or Vercel env:** This bypasses TLS everywhere, including in the Next.js server itself. It belongs only in the CLI npm script and local shell exports.
- **Global wipe before ingestion starts:** Wiping all rows before starting means a mid-run failure leaves the DB empty. Per-doc delete (then insert) means only that doc's rows are temporarily absent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown chunking | Custom splitter | `chunkMarkdown()` from `src/lib/chunker.ts` | Already built, tested, heading-aware with overlap |
| Single-text embedding | Custom OpenAI wrapper | `embedText()` from `src/lib/embeddings.ts` | Already built (note: batch variant uses `openai.embeddings.create({ input: string[] })` directly) |
| DB connection | New Neon client | `sql` from `src/lib/db.ts` | Already configured with `POSTGRES_URL_NON_POOLING` |
| H1 extraction | Markdown parser library | Single regex `content.match(/^# (.+)$/m)` | Sufficient for well-formed docs; no new dependency needed |
| File listing | `glob` or `fast-glob` | `fs.readdirSync()` + `.filter()` | Simple directory, no glob patterns needed, no new dependency |

**Key insight:** Phase 3 is primarily orchestration of already-built utilities. The only net-new code is `src/lib/ingest.ts` (shared orchestrator), `scripts/ingest.ts` (CLI wrapper), and `src/app/api/ingest/route.ts` (HTTP wrapper).

---

## Common Pitfalls

### Pitfall 1: Vector Serialization to Neon

**What goes wrong:** Passing `embedding` (a `number[]`) directly as a parameter to the `sql` tag causes a type error or inserts NULL because Neon doesn't know how to coerce a JS array to the PostgreSQL `vector` type.

**Why it happens:** The `@neondatabase/serverless` driver serializes JS values to their PostgreSQL equivalents, but `vector` is a custom type. There is no built-in serializer for it.

**How to avoid:** Always stringify the embedding array and append `::vector` cast: `${JSON.stringify(embedding)}::vector`.

**Warning signs:** `NULL` in the `embedding` column after insert; TypeScript or runtime errors mentioning array/vector type mismatch.

### Pitfall 2: IVFFlat on Empty Table

**What goes wrong:** If `CREATE INDEX` runs before any rows exist, the index is created but empty. Subsequent inserts do update it incrementally, but IVFFlat's `lists` parameter is set at creation time based on zero data — the clustering is meaningless.

**Why it happens:** Putting the IVFFlat CREATE in the migration script (Phase 2) rather than in the ingest script (Phase 3).

**How to avoid:** IVFFlat creation is explicitly in Phase 3 ingest, not Phase 2 migration. This is a locked decision. Code comment in `migrate.ts` already documents this: "No IVFFlat index is created here."

**Warning signs:** Index exists after migration but before ingest; Phase 4 cosine searches return poor results.

### Pitfall 3: `maxDuration` Not Exported at Top Level

**What goes wrong:** Production ingestion via `/api/ingest` times out at 10 seconds (Vercel Hobby default) when embedding 8 docs × ~12 chunks each.

**Why it happens:** `maxDuration` placed inside the handler function, or defined as a `const` but not exported, or placed in a config object instead of as a top-level named export.

**How to avoid:** Place `export const maxDuration = 60;` at the top of `route.ts` as a top-level export statement.

**Warning signs:** `/api/ingest` returns 504 Gateway Timeout in production; works locally where there's no timeout.

### Pitfall 4: `INGEST_SECRET` Empty String Treated as Configured

**What goes wrong:** `process.env.INGEST_SECRET` returns `""` (empty string) which is falsy in JavaScript but is a valid string. A check of `if (!secret)` catches empty string correctly, but a check of `if (secret === undefined)` does not.

**Why it happens:** Env var set to empty string in Vercel dashboard or `.env.local`.

**How to avoid:** The fail-closed check `if (!secret)` (not `=== undefined`) correctly handles both missing and empty-string cases. Return 500, not 401, when the server is misconfigured — fail-closed per locked decision.

### Pitfall 5: tsx Not Loading `.env.local`

**What goes wrong:** `scripts/ingest.ts` runs with `npx tsx` but `POSTGRES_URL_NON_POOLING` and `OPENAI_API_KEY` are undefined, causing immediate errors from `db.ts` and `openai` client initialization.

**Why it happens:** Next.js's env loading (which reads `.env.local`) only runs inside the Next.js server context. `tsx` is a bare TypeScript runner with no framework env loading.

**How to avoid:** User must export env vars before running: `export $(grep -v '^#' .env.local | xargs) && npm run ingest`. This is a known, locked pattern from Phase 2. Document in README and as a comment at the top of `scripts/ingest.ts`.

### Pitfall 6: `@neondatabase/serverless` `transaction()` API Uncertainty

**What goes wrong:** Calling `sql.transaction()` with the wrong calling convention errors at runtime.

**Why it happens:** The `neon()` function's tagged-template result has a `transaction()` method, but the exact calling convention differs between versions: some versions accept an array of SQL template results, others accept a callback.

**How to avoid:** If using transactions, verify against the installed version (^1.0.2). Alternatively, use sequential `await sql` calls without a transaction — acceptable for this use case since continue-on-error handles partial failures.

**Warning signs:** `TypeError: sql.transaction is not a function` or unexpected behavior.

---

## Code Examples

### Reading and Filtering the docs/ Directory

```typescript
// Source: Node.js built-in fs/path
import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.join(process.cwd(), 'docs');
const SKIP_FILES = new Set(['00-PRD.md', 'CLAUDE.md', 'DESIGN.md']);

const docFiles = fs.readdirSync(DOCS_DIR)
  .filter(f => f.endsWith('.md') && !SKIP_FILES.has(f))
  .sort();
// Produces: ['01-getting-started.md', '02-stack-overview.md', ..., '08-resources.md']
```

### Deriving docId and docTitle

```typescript
// docId: filename without extension
const docId = path.basename(filePath, '.md');  // e.g. '01-getting-started'

// docTitle: first H1 heading
function extractDocTitle(content: string, fallback: string): string {
  const match = content.match(/^# (.+)$/m);
  return match ? match[1].trim() : fallback;
}
const docTitle = extractDocTitle(content, docId);
```

### Batch Embedding a Single Doc

```typescript
// Source: openai ^6.27.0 (installed); same client pattern as embeddings.ts
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const chunks = chunkMarkdown(content, docId, docTitle);  // Chunk[]
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunks.map(c => c.content),  // string[] — one call for all chunks
});
// response.data[i].embedding === number[1536], ordered to match input
const embeddings: number[][] = response.data.map(d => d.embedding);
```

### Inserting a Chunk with Embedding to Neon

```typescript
// Source: @neondatabase/serverless ^1.0.2 pattern; db.ts sql export
import { sql } from './db';

await sql`
  INSERT INTO doc_chunks (doc_id, doc_title, chunk_index, content, embedding)
  VALUES (
    ${chunk.docId},
    ${chunk.docTitle},
    ${chunk.chunkIndex},
    ${chunk.content},
    ${JSON.stringify(embedding)}::vector
  )
`;
```

### Deleting Existing Rows Before Upsert (Idempotency)

```typescript
await sql`DELETE FROM doc_chunks WHERE doc_id = ${docId}`;
```

### Building the IVFFlat Index

```typescript
// Source: CONTEXT.md locked decision; pgvector documentation
await sql`
  CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx
  ON doc_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
`;
```

### CLI Entry Point Structure

```typescript
// scripts/ingest.ts
// Run: export $(grep -v '^#' .env.local | xargs) && npm run ingest
import path from 'path';
import { ingestAll } from '../src/lib/ingest';

const DOCS_DIR = path.join(process.cwd(), 'docs');

ingestAll(DOCS_DIR).then(summary => {
  const failLine = summary.errors.length
    ? ` Failed: [${summary.errors.map(e => e.docId).join(', ')}]`
    : '';
  console.log(
    `Ingested ${summary.totalChunks} chunks from ${summary.results.length} documents.${failLine}`
  );
  process.exit(summary.errors.length > 0 ? 1 : 0);
}).catch(err => {
  console.error('Fatal ingest error:', err);
  process.exit(1);
});
```

### API Route Handler Skeleton

```typescript
// src/app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { ingestDoc, ingestAll } from '@/lib/ingest';

export const maxDuration = 60;  // Top-level export — Vercel reads this at build time

export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'INGEST_SECRET not configured' }, { status: 500 });
  }
  if (request.headers.get('x-ingest-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... body parsing, call ingestDoc or ingestAll, return { ingested, docs }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/postgres` | `@neondatabase/serverless` | Q4 2024 | `@vercel/postgres` officially deprecated; `@neondatabase/serverless` is the replacement |
| Per-chunk embedding calls | Batch `input: string[]` call | OpenAI SDK v1+ | Dramatically reduces API calls and avoids rate limits |
| IVFFlat in migration | IVFFlat in ingest script after data | pgvector best practice | Index built on populated table; `lists` parameter is meaningful |
| `process.env.DATABASE_URL` for pgvector | `POSTGRES_URL_NON_POOLING` | Neon + PgBouncer clarification | Pooled connection breaks pgvector session state |

**Deprecated/outdated:**
- `@vercel/postgres`: Deprecated Q4 2024. Project already uses `@neondatabase/serverless` — no action needed.
- `openai.embeddings.create({ input: string })` (single string): Works but misses batching opportunity. Use `input: string[]` for ingest to batch per doc.

---

## Open Questions

1. **`@neondatabase/serverless` `transaction()` calling convention for version ^1.0.2**
   - What we know: The `neon()` function exposes a `transaction()` method. It exists in the library.
   - What's unclear: Whether version ^1.0.2 accepts `sql.transaction(queriesArray)` or `sql.transaction(callback)`.
   - Recommendation: Use sequential `await sql` statements (no transaction) for simplicity. The continue-on-error pattern already handles per-doc failures. Atomicity within a single doc's insert is not critical for v1.

2. **`process.cwd()` path resolution in Vercel serverless functions**
   - What we know: In local `tsx` context, `process.cwd()` returns the project root where `docs/` lives. In Vercel, serverless functions run in `/var/task` with the project files included.
   - What's unclear: Whether `docs/` is included in the Vercel function bundle for the `/api/ingest` route.
   - Recommendation: Vercel bundles the entire project directory for Next.js deployments. `path.join(process.cwd(), 'docs')` should work. Use `process.env.VERCEL` check as a fallback if needed. The API route's full re-ingest capability is a Phase 6 production concern — Phase 3 focus is `npm run ingest` locally.

---

## Validation Architecture

> `nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — no `vitest`, `jest`, or other test runner in `package.json` |
| Config file | None — Wave 0 gap (see below) |
| Quick run command | Manual SQL queries via Neon console or `npx tsx` verification script |
| Full suite command | Manual verification checklist (no automated test runner) |

**Note:** No test framework is installed in the current project. Phase 3 verification is entirely through manual SQL queries and shell commands. The Validation Architecture below documents exactly what to check and how.

### Phase Requirements → Verification Map

| Req ID | Behavior | Verification Type | Command / Query |
|--------|----------|-------------------|-----------------|
| INGS-01 | CLI reads 8 docs, skips `00-PRD.md` | Manual / Shell | Run `npm run ingest`; observe per-doc log lines — should see exactly 8 lines (01–08), never `00-PRD.md` |
| INGS-02 | Embedding calls are batched (one per doc) | Manual / Shell | Run ingest with `OPENAI_API_KEY` captured in a proxy or observe OpenAI dashboard usage — 8 embedding calls expected, not 80+ |
| INGS-03 | Idempotency — re-run keeps row count stable | Manual / SQL | Run ingest twice; after each: `SELECT COUNT(*) FROM doc_chunks;` — count must match on both runs |
| INGS-04 | IVFFlat index created after all rows inserted | Manual / SQL | After ingest: `SELECT indexname FROM pg_indexes WHERE tablename = 'doc_chunks';` — must return `doc_chunks_embedding_idx` |
| INGS-05 | `npm run ingest` defined in package.json | Automated / Shell | `node -e "const p=require('./package.json');process.exit(p.scripts.ingest?0:1)"` |
| INGS-06 | `/api/ingest` is fail-closed | Manual / curl | See curl commands below |
| INGS-07 | Non-null embeddings in DB after ingest | Manual / SQL | `SELECT COUNT(*) FROM doc_chunks WHERE embedding IS NULL;` — must return 0; `SELECT vector_dims(embedding) FROM doc_chunks LIMIT 1;` — must return 1536 |

### Verification Commands

**INGS-03: Idempotency check (row count stable after re-run)**

```bash
# Run ingest, record count, run again, compare
export $(grep -v '^#' .env.local | xargs) && npm run ingest
# In Neon SQL editor:
SELECT COUNT(*) FROM doc_chunks;
# Note the count, then:
npm run ingest
SELECT COUNT(*) FROM doc_chunks;
# Count must be identical — not doubled
```

**INGS-04: IVFFlat index exists after ingest**

```sql
-- Run in Neon SQL editor or psql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'doc_chunks';
-- Expected row: doc_chunks_embedding_idx using ivfflat
```

**INGS-06: `/api/ingest` auth verification (fail-closed)**

```bash
# Test 1: No header — must return 401
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/api/ingest
# Expected: 401

# Test 2: Wrong secret — must return 401
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/api/ingest \
  -H "x-ingest-secret: wrong-secret"
# Expected: 401

# Test 3: INGEST_SECRET env var unset — must return 500
# (Test in isolation by unsetting env var before starting dev server)
# Expected: 500 {"error":"INGEST_SECRET not configured"}

# Test 4: Correct secret — must return 200
curl -s \
  -X POST http://localhost:3000/api/ingest \
  -H "x-ingest-secret: $INGEST_SECRET" \
  -H "Content-Type: application/json"
# Expected: 200 {"ingested": N, "docs": [...]}
```

**INGS-07: Non-null embeddings and correct dimensions**

```sql
-- Check for null embeddings (must return 0)
SELECT COUNT(*) FROM doc_chunks WHERE embedding IS NULL;

-- Check embedding dimensions (must return 1536)
SELECT vector_dims(embedding) FROM doc_chunks LIMIT 1;

-- Check total row count (should be ~80-120 chunks for 8 docs)
SELECT doc_id, COUNT(*) as chunk_count
FROM doc_chunks
GROUP BY doc_id
ORDER BY doc_id;
-- Expected: 8 rows, one per doc, each with 5-20 chunks
```

**INGS-05: npm script exists (automated shell check)**

```bash
node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.ingest ? 0 : 1)" \
  && echo "PASS: npm run ingest defined" \
  || echo "FAIL: npm run ingest missing"
```

**Overall ingest health check (run after INGS-07 passes)**

```sql
-- One query to confirm all docs ingested with valid embeddings
SELECT
  doc_id,
  doc_title,
  COUNT(*) AS chunks,
  SUM(CASE WHEN embedding IS NULL THEN 1 ELSE 0 END) AS null_embeddings,
  vector_dims(MAX(embedding)) AS dims
FROM doc_chunks
GROUP BY doc_id, doc_title
ORDER BY doc_id;
-- Expected: 8 rows, null_embeddings = 0 for all, dims = 1536 for all
```

### Sampling Rate

- **Per task (during implementation):** Run the single-doc verification SQL after each task that writes to the DB.
- **After full ingest:** Run the full health-check SQL above plus the IVFFlat index check.
- **Phase gate before moving to Phase 4:** All 5 manual SQL checks pass + auth curl tests pass + `npm run ingest` exits 0 + row count stable after re-run.

### Wave 0 Gaps

No test framework is installed. The following gaps exist but are acceptable for Phase 3 because verification is SQL-based:

- [ ] No Vitest/Jest config — all verification is manual SQL + shell commands
- [ ] No test files directory

If the team wants automated testing in a future phase, add:
```bash
npm install -D vitest @vitest/coverage-v8
```

For Phase 3 specifically, the verification approach is: write, run ingest, query Neon. This is sufficient for a data pipeline where the "test" is the data itself.

---

## Sources

### Primary (HIGH confidence)

- `src/lib/db.ts` (project file, read directly) — confirms `sql` export, `POSTGRES_URL_NON_POOLING` pattern, `@neondatabase/serverless` import
- `src/lib/chunker.ts` (project file, read directly) — confirms `chunkMarkdown(content, docId, docTitle)` signature and `Chunk` interface
- `src/lib/embeddings.ts` (project file, read directly) — confirms OpenAI client instantiation pattern, `text-embedding-3-small` model, single-text `embedText()` function
- `scripts/migrate.ts` (project file, read directly) — confirms `doc_chunks` table schema, `sql` tagged-template pattern for DDL
- `package.json` (project file, read directly) — confirms all dependencies present (`@neondatabase/serverless ^1.0.2`, `openai ^6.27.0`, `tsx ^4.21.0`)
- `docs/*.md` (8 files, read directly via bash) — confirms all H1 headings and actual docId/docTitle mappings
- `.planning/phases/03-ingestion-pipeline/03-CONTEXT.md` — all locked decisions, exact SQL, error handling behavior
- `.planning/config.json` — confirms `nyquist_validation: true`

### Secondary (MEDIUM confidence)

- OpenAI API documentation pattern for `embeddings.create({ input: string[] })` — batch ordering guarantee is a documented API contract; applied from knowledge of OpenAI SDK v6 (installed version)
- pgvector IVFFlat documentation: `lists = sqrt(rows)` guideline for index tuning — consistent with project's `lists = 100` for ~100 rows
- Vercel `maxDuration` documentation: top-level named export requirement in Next.js App Router route files

### Tertiary (LOW confidence)

- `@neondatabase/serverless` `transaction()` API calling convention for version ^1.0.2 — not verified against installed version source; recommendation is to avoid transactions and use sequential awaits

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from `package.json` and existing source files
- Architecture patterns: HIGH — derived directly from locked CONTEXT.md decisions + existing code patterns
- File contents (docIds/docTitles): HIGH — read from actual doc files
- Pitfalls: HIGH — based on reading actual source code, locked decisions, and known constraints from STATE.md
- `@neondatabase/serverless` transaction() API: LOW — not verified against installed version

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable stack; no fast-moving dependencies)
