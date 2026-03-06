# Pitfalls Research

**Domain:** RAG chat app (Next.js + pgvector + OpenAI) + local MCP server (stdio, Windows, no admin)
**Researched:** 2026-03-06
**Confidence:** HIGH (most pitfalls verified across multiple authoritative sources)

---

## Critical Pitfalls

### Pitfall 1: IVFFlat Index Built Before Data Exists

**What goes wrong:**
The schema migration creates the `ivfflat` index on an empty `doc_chunks` table (zero rows). IVFFlat requires a k-means clustering pass over existing data at index-creation time. Building on an empty table produces an empty, structureless index — the Postgres query planner then ignores it and falls back to a sequential scan for every similarity query, silently. Retrieval still works (sequential scan is correct), but there is no performance safety net and the index is useless until rebuilt.

**Why it happens:**
Developers run schema migrations first, then run ingestion later. The `CREATE INDEX ... USING ivfflat` SQL runs at migration time when no rows exist. The index is never automatically rebuilt when rows are inserted.

**How to avoid:**
Run the `CREATE INDEX` statement at the end of the ingestion pipeline, after all chunks are inserted, not in the schema migration. Use this pattern:

```sql
-- In migration: create table only, no index
CREATE TABLE IF NOT EXISTS doc_chunks (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  source TEXT,
  chunk_index INT
);

-- In ingest script: create/recreate index AFTER rows are inserted
DROP INDEX IF EXISTS doc_chunks_embedding_idx;
CREATE INDEX doc_chunks_embedding_idx
  ON doc_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

With only ~8 docs and ~80-200 chunks, `lists=100` in `PROJECT.md` is deliberately oversized (recommended: `rows/1000`). This is intentional for project-specified consistency; it means performance is index-build-expensive but retrieval is accurate. Accept it.

**Warning signs:**
- `EXPLAIN` on a similarity query shows `Seq Scan` instead of `Index Scan`
- Index exists in `pg_indexes` but was created before ingestion ran
- `SELECT COUNT(*) FROM doc_chunks` returns 0 at migration time

**Phase to address:** RAG App — Schema & Ingestion pipeline (Phase 1/2)

---

### Pitfall 2: Embedding Dimension Mismatch Between Schema and Model

**What goes wrong:**
The `embedding` column is defined as `VECTOR(N)` at schema creation time. If the dimension `N` doesn't match the dimension the OpenAI API returns, every `INSERT` during ingestion throws a Postgres error: `expected N dimensions, not M`. This halts ingestion entirely.

**Why it happens:**
- Developer defines `VECTOR(768)` or `VECTOR(3072)` without checking the model spec
- Developer uses the `dimensions` parameter in the OpenAI API call (e.g., `dimensions: 512`) to truncate output, but the schema still says `VECTOR(1536)`
- Developer switches embedding models mid-project without dropping and recreating the column

The project specifies `text-embedding-3-small` which outputs **1536 dimensions** by default. This must be the column width.

**How to avoid:**
Hardcode `VECTOR(1536)` in the schema. Add a runtime assertion in the ingestion script:

```typescript
const EXPECTED_DIM = 1536;
if (embedding.length !== EXPECTED_DIM) {
  throw new Error(`Embedding dimension mismatch: got ${embedding.length}, expected ${EXPECTED_DIM}`);
}
```

Never pass a `dimensions` parameter to the OpenAI embeddings call unless the schema column is updated to match.

**Warning signs:**
- Postgres error on `INSERT`: `expected 1536 dimensions, not X`
- Ingestion script exits with database error on the first chunk
- Changing the OpenAI model name in `.env` without updating the schema

**Phase to address:** RAG App — Schema & Ingestion pipeline (Phase 1/2)

---

### Pitfall 3: MCP Server Fails on Windows Due to Node Path Resolution in mcp.json

**What goes wrong:**
The `.vscode/mcp.json` uses `"command": "node"` or `"command": "npx"` without an absolute path. On Windows machines where Node.js was installed user-scope (no admin), the executable is not on the system PATH that VSCode inherits. VSCode spawns the MCP process and gets `spawn node ENOENT` — the server never starts. GitHub Copilot shows the tool as unavailable with no useful error message surfaced to the user.

**Why it happens:**
VSCode's PATH on Windows is inherited from the environment at launch time, which may not include user-scoped Node installations (`%APPDATA%\nvm\...`, `%LOCALAPPDATA%\Programs\nodejs\...`). `npx` has the same problem. New hires with no admin rights install Node via nvm-windows or the user installer, placing it in a non-standard location.

**How to avoid:**
Use absolute paths in `.vscode/mcp.json`. The project README must instruct new hires to run `where node` in PowerShell/Git Bash and paste the result:

```json
{
  "servers": {
    "crowe-mcp": {
      "type": "stdio",
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["dist/index.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

Provide a setup script (`scripts/generate-mcp-config.js`) that detects the local Node path and writes `.vscode/mcp.json` automatically. This removes the manual step.

**Warning signs:**
- Copilot Agent Mode shows MCP server as "failed to start"
- Running the command manually in terminal works, but VSCode cannot start it
- New hire is on a machine where Node was installed without admin rights

**Phase to address:** MCP Server — Configuration & Windows setup (Phase 3/4)

---

### Pitfall 4: MCP Server Crashes Immediately Due to ESM/CommonJS Module Mismatch

**What goes wrong:**
The MCP server TypeScript is compiled to `.js` but either: (a) the compiled output uses ESM `import` syntax and `package.json` lacks `"type": "module"`, or (b) `package.json` has `"type": "module"` but the compiled output is CommonJS `require()`. Node.js exits immediately with `ERR_REQUIRE_ESM` or `SyntaxError: Cannot use import statement`. Since the MCP server runs over stdio, VSCode gets an empty stdout response and reports the server as crashed — no useful error is surfaced to the user.

**Why it happens:**
The `@modelcontextprotocol/sdk` package uses ESM. Developers scaffold a TypeScript project with default CJS settings (`"module": "CommonJS"` in tsconfig), which mismatches the MCP SDK's module format. Alternatively, developers add `"type": "module"` but use `ts-node` which doesn't handle ESM cleanly on Windows.

**How to avoid:**
Compile to CommonJS and do not rely on `ts-node` at runtime. Use this tsconfig:

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2022",
    "outDir": "./dist"
  }
}
```

Build with `tsc` and run `node dist/index.js` — not `ts-node src/index.ts`. The `@modelcontextprotocol/sdk` ships both ESM and CJS; the CJS version loads correctly when your output is CommonJS. Add a `prepare` or `build` npm script so the README instructs new hires to run `npm run build` before first use.

**Warning signs:**
- `node dist/index.js` in terminal prints ESM or `require` error and exits
- `.vscode/mcp.json` points to `.ts` source files instead of compiled `.js`
- `package.json` has `"type": "module"` but `tsconfig.json` has `"module": "CommonJS"`

**Phase to address:** MCP Server — Project scaffold & build pipeline (Phase 3)

---

### Pitfall 5: NODE_TLS_REJECT_UNAUTHORIZED=0 Leaking Into Runtime Code

**What goes wrong:**
The Crowe SSL proxy requires `NODE_TLS_REJECT_UNAUTHORIZED=0` for CLI commands (`npm`, `vercel`, `git`). Developers copy this pattern into `.env.local`, Next.js server code, or the MCP server's startup script. This disables TLS certificate validation globally for the entire Node.js process — including all outbound OpenAI API calls, Vercel Postgres connections, and any other HTTPS requests. The application becomes vulnerable to man-in-the-middle interception on any network, including Crowe's own proxy.

**Why it happens:**
The fix works and is easy. Developers use it as a hammer for every TLS problem without understanding that it applies process-wide. It feels like a development-only flag but is actually a runtime flag that persists if added to `.env` files or source code.

**How to avoid:**
- Keep `NODE_TLS_REJECT_UNAUTHORIZED=0` only in shell profiles and CLI wrapper scripts, never in `.env` files or application code
- For the MCP server, do not set this flag at all — the server only makes outbound calls if it's enhanced with network tools, which is out of scope
- For Next.js on Vercel (deployed), this flag must never be set — deployed code runs outside the Crowe proxy; Vercel's TLS is legitimate
- Prefer `NODE_EXTRA_CA_CERTS` pointing to the Crowe CA certificate PEM as the correct long-term fix: `NODE_EXTRA_CA_CERTS=C:\path\to\crowe-ca.pem`
- Add a startup check in `ingest.ts` that warns if `NODE_TLS_REJECT_UNAUTHORIZED === '0'` in production

**Warning signs:**
- `.env.local` or `.env` contains `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Application code sets `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'`
- Deployed Vercel environment variables include this flag

**Phase to address:** RAG App — Environment setup (Phase 1); MCP Server — Setup docs (Phase 3)

---

### Pitfall 6: Cosine Distance vs. Cosine Similarity Operator Confusion

**What goes wrong:**
pgvector's `<=>` operator returns **cosine distance** (0 = identical, 2 = opposite). Similarity is `1 - distance`. Developers write queries filtering `WHERE embedding <=> $1 < 0.3` intending "similarity above 0.3" but actually applying a distance threshold, which means they are keeping chunks where distance is less than 0.3 (i.e., very similar — correct behavior). However, when they log or display scores, they show raw distance as "similarity" and confuse 0.1 (very similar) with 0.9 (somewhat similar).

The reverse mistake: filtering `WHERE (1 - embedding <=> $1) > 0.3` — the operator precedence in SQL means this is parsed as `WHERE 1 - (embedding <=> $1) > 0.3` and works correctly, but many examples online wrap it incorrectly.

**Why it happens:**
The `<=>` operator name suggests "similarity" (arrows pointing together) but returns distance. Official pgvector README says "cosine distance" clearly, but many tutorials use the term interchangeably with similarity.

**How to avoid:**
The project specifies threshold `0.3` as a **similarity** threshold. The correct SQL is:

```sql
SELECT content, source, 1 - (embedding <=> $1) AS similarity
FROM doc_chunks
WHERE 1 - (embedding <=> $1) > 0.3
ORDER BY similarity DESC
LIMIT 5;
```

Add a comment in the query: `-- <=> returns cosine DISTANCE; 1 - distance = similarity`. Test the threshold by inserting a known chunk and querying with its exact text — similarity should be ~1.0.

**Warning signs:**
- Retrieval returns 0 results for queries that should match
- Retrieval returns everything regardless of relevance
- Score displayed in UI is 0.05 for a very relevant result (should be ~0.95)

**Phase to address:** RAG App — Chat API & retrieval logic (Phase 2)

---

### Pitfall 7: Chunking Destroys Context at Section Boundaries

**What goes wrong:**
Markdown docs are split by character count or token count without respecting heading boundaries. A chunk that starts mid-section with "This approach requires..." has no antecedent — the LLM cannot answer what "this approach" refers to because the heading and setup paragraph are in the previous chunk. Retrieved chunks feel like fragments, and the LLM either hallucinates to fill context gaps or outputs incoherent answers.

**Why it happens:**
Simple chunking implementations (`text.split()` every N characters) are fast and easy. Markdown structure (headings, list items, code blocks) is ignored.

**How to avoid:**
Use heading-aware chunking for markdown: split on `## ` and `### ` boundaries first, then split oversized sections by paragraph. Prepend the document title and section heading to every chunk:

```
[Source: 03-stack-decisions.md | Section: Frontend Framework]
We use Next.js 14 with the App Router because...
```

This ensures every chunk is self-contained and the embedding captures both the document origin and the topic. Target 300-600 tokens per chunk with 50-token overlap between adjacent chunks from the same section.

**Warning signs:**
- LLM answers reference "this" or "these" without antecedents in the retrieved chunks
- Retrieved chunks start with conjunctions ("However," "Additionally,") without context
- Similarity search retrieves chunks that mention keywords but miss the actual answer

**Phase to address:** RAG App — Ingestion pipeline (Phase 1/2)

---

### Pitfall 8: Vercel Function Timeout on Ingestion Route

**What goes wrong:**
The `/api/ingest` route processes 8 markdown files, generates embeddings for each chunk via OpenAI API (sequential or batched calls), and writes to Postgres. On Vercel's Hobby plan, serverless functions time out at **10 seconds**. Processing 8 docs with ~15 chunks each = ~120 OpenAI API calls if done one-at-a-time. Even at 100ms/call, that is 12 seconds — timeout guaranteed.

**Why it happens:**
Local development has no timeout. The ingest route works perfectly locally. Deploying to Vercel and triggering via `curl` results in a 504 with no clear error message.

**How to avoid:**
Set `maxDuration` on the route and use batched embedding calls:

```typescript
// app/api/ingest/route.ts
export const maxDuration = 60; // seconds — requires Vercel Pro or explicit config

// Batch embedding calls: send up to 100 texts per OpenAI request
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunkTexts, // array of strings, not one-at-a-time
});
```

OpenAI's embeddings endpoint accepts an array of strings in a single call. Batch all chunks from all docs into one or two API calls instead of one per chunk. This reduces total API time from ~12s to ~1-2s.

**Warning signs:**
- `/api/ingest` returns 504 in production but works locally
- Vercel function logs show "Function execution timed out"
- Ingestion succeeds for the first few docs but stops partway through

**Phase to address:** RAG App — Ingestion pipeline & deployment (Phase 2)

---

### Pitfall 9: MCP Server Bundled Assets Out of Sync With Actual Docs

**What goes wrong:**
The MCP server uses "bundled assets mode" — the markdown docs are committed into the repo at build time. When the RAG app's knowledge base docs are updated (new hire onboarding info, updated stack decisions), the MCP server's bundled assets are not updated. New hires get stale answers from the MCP tools while the web app gives current answers. The mismatch erodes trust in both tools.

**Why it happens:**
Two repos, maintained independently. There is no automated sync. The person who updates the docs in the RAG app repo does not know they also need to push updated docs to the MCP server repo.

**How to avoid:**
- Document the sync procedure explicitly in both repos' READMEs: "When docs change, copy `/docs/` to `crowe-mcp-server/assets/` and push"
- Keep `ASSETS_PATH` env var as the live-mode escape hatch — advanced users point it at the actual docs directory
- Consider a future automation: a post-merge GitHub Action that opens a PR in the MCP repo when docs change

**Warning signs:**
- MCP tool answers reference outdated information that the RAG app no longer shows
- A doc was added to the RAG ingestion but the MCP `search_docs` tool cannot find it
- `git log` on the MCP repo shows assets haven't changed in weeks while RAG docs were updated

**Phase to address:** MCP Server — Asset bundling & README (Phase 3/4)

---

### Pitfall 10: INGEST_SECRET Not Set Causes Silent Auth Failure or Open Route

**What goes wrong:**
Two failure modes: (a) `INGEST_SECRET` is set in Vercel env vars but the curl command omits the header — the route returns 401 and ingestion fails silently if the caller doesn't check the response. (b) `INGEST_SECRET` is not set in production Vercel env vars — if the route code does `if (!secret) return 401`, ingestion always fails; if the route code does `if (secret && req.headers['x-ingest-secret'] !== secret)`, then missing env var means the check is skipped and the route is open.

**Why it happens:**
Env var configuration is done in two places (`.env.local` for local, Vercel dashboard for production) and it is easy to forget one. The check logic is easy to write with accidental bypass.

**How to avoid:**
Write the check to fail-closed: reject if `INGEST_SECRET` env var is missing in production:

```typescript
const secret = process.env.INGEST_SECRET;
if (!secret) {
  return Response.json({ error: 'INGEST_SECRET not configured' }, { status: 500 });
}
if (req.headers.get('x-ingest-secret') !== secret) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Test with: `curl -X POST https://your-app.vercel.app/api/ingest` (no header) — must return 401 or 500, never proceed.

**Warning signs:**
- Ingestion works locally but fails in production with 401 or 500
- Production ingestion appears to succeed but `doc_chunks` table remains empty
- `/api/ingest` is accessible without authentication in production

**Phase to address:** RAG App — API security & deployment (Phase 2)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env` | Unblocks dev on Crowe network immediately | Disables TLS validation app-wide, including OpenAI calls | Never — use only in shell profile for CLI commands |
| Create IVFFlat index in schema migration | Schema-as-code is clean | Useless index until rebuild; silent sequential scans | Never — always create after data exists |
| `ts-node src/index.ts` as MCP run command | No build step needed | Fails on Windows with ESM errors; slow startup | Never for MCP server shipped to users |
| Sequential per-chunk OpenAI embedding calls | Simpler code | Hits Vercel timeout on any real document set | Only acceptable for local-only ingestion testing |
| Hardcoded similarity threshold (0.3) | Simple to implement | May need tuning if docs change significantly | Acceptable for MVP — add tuning note in code |
| Committing bundled assets without version marker | Simple setup for new hires | No way to detect staleness | Acceptable if sync procedure is documented |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vercel Postgres + pgvector | Using `sql` template tag for vector inserts with raw array | Use parameterized query with `$1::vector` cast: `INSERT INTO doc_chunks (embedding) VALUES ($1::vector)` |
| OpenAI Embeddings API | Calling one text at a time in a loop | Pass array of strings in single `embeddings.create({ input: [...] })` call |
| pgvector similarity query | Using `<=>` result directly as "similarity score" | Convert: `1 - (embedding <=> query_vector)` for similarity; filter on that value |
| VSCode mcp.json on Windows | Using `"command": "node"` without absolute path | Use `where node` output as absolute path in `"command"` field |
| Vercel env vars | Setting only in `.env.local`, forgetting Vercel dashboard | Verify each var appears in Vercel project settings under Environment Variables |
| OpenAI API key scope | Using same key for both ingest and chat | Acceptable here — single key, but ensure key is in Vercel env vars, not hardcoded |
| Vercel Postgres connection | Using `POSTGRES_URL` (pooled) for pgvector operations | pgvector works with pooled URL; use `POSTGRES_URL_NON_POOLING` only if you hit Pgbouncer `prepared statements` errors |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| IVFFlat index with `lists=100` on 100-row table | All queries do sequential scan; index is never used | Build index after ingestion; accept seq scan is fine at this scale | Always at this doc count — not a real performance issue, just hygiene |
| No embedding batching on ingest | Vercel 504 timeout, slow local ingest | Batch all chunk texts in single OpenAI API call | At ~80+ chunks on Vercel Hobby plan |
| Fetching entire `doc_chunks` table for search | Query time grows linearly with doc count | Always use `ORDER BY embedding <=> $1 LIMIT 5` — never fetch all rows | At ~10,000+ chunks |
| Client-side message history unbounded | Browser memory grows; large payloads to chat API | Cap history at last 10 messages for context window | At ~50+ messages in one session |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `NODE_TLS_REJECT_UNAUTHORIZED=0` in application env vars | MITM on all HTTPS calls including OpenAI API | Shell-only; never in `.env` files or Vercel env vars |
| `INGEST_SECRET` check that bypasses when env var is missing | Public ingest endpoint — anyone can overwrite the knowledge base | Fail-closed: return 500 if `INGEST_SECRET` not configured |
| `OPENAI_API_KEY` in client-side Next.js code | Key exposed in browser bundle | All OpenAI calls must be in `app/api/` server routes only; never import openai in `app/` client components |
| MCP server reading arbitrary file paths from tool arguments | Path traversal if tools accept user-provided paths | Restrict all file reads to the bundled `assets/` directory; validate paths against whitelist |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state during chat response | User clicks "Send" and sees nothing — assumes broken | Show spinner or "Thinking..." immediately on submit |
| Showing raw cosine scores in source chips | Confusing — "0.87 similarity" means nothing to a new hire | Show document name and section only; omit numeric score from UI |
| Threshold returns 0 results with no explanation | User sees empty response or LLM hallucinates | Return explicit "I don't have information on that" when no chunks exceed 0.3 threshold |
| Starter prompts that don't match actual doc content | First interaction fails, destroys trust | Derive starter prompts directly from doc headings during development |
| MCP tool error messages surfaced as raw JSON | New hire sees `{"error":"ENOENT"}` | Wrap all MCP tool handlers in try/catch; return human-readable error text |

---

## "Looks Done But Isn't" Checklist

- [ ] **Ingestion:** Verify `doc_chunks` table has rows after running ingest — `SELECT COUNT(*) FROM doc_chunks` should return > 0
- [ ] **Index:** Verify index was built after data exists — `EXPLAIN SELECT ... ORDER BY embedding <=> $1 LIMIT 5` should show `Index Scan`, not `Seq Scan` (note: at small row counts, Postgres may still choose seq scan as cheaper — confirm index exists with `\di` in psql)
- [ ] **Embeddings:** Log the first embedding's `length` during ingest — must be exactly 1536
- [ ] **Similarity threshold:** Query with exact text from a doc — similarity score should be > 0.9
- [ ] **Chat API:** Test with an off-topic question (e.g., "What is the weather?") — must return "I don't have information on that", not a hallucinated answer
- [ ] **INGEST_SECRET:** Hit `/api/ingest` without the header in production — must return 401 or 500
- [ ] **OpenAI key:** Confirm `OPENAI_API_KEY` is set in Vercel production env vars (not just `.env.local`)
- [ ] **MCP server:** Run `node dist/index.js` directly in terminal before adding to mcp.json — must start without errors
- [ ] **MCP on Windows:** Test `mcp.json` with exact absolute path to `node.exe` — Copilot must show tools as available
- [ ] **TLS flag:** Confirm neither `.env.local` nor Vercel env vars contain `NODE_TLS_REJECT_UNAUTHORIZED`

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| IVFFlat index built on empty table | LOW | Run `DROP INDEX doc_chunks_embedding_idx; CREATE INDEX ...` after ingestion completes |
| Embedding dimension mismatch | MEDIUM | Drop and recreate column: `ALTER TABLE doc_chunks DROP COLUMN embedding; ALTER TABLE doc_chunks ADD COLUMN embedding VECTOR(1536);` then re-ingest |
| MCP server ESM crash on Windows | LOW | Change tsconfig to CJS output, rebuild with `npm run build`, update mcp.json to point to `dist/index.js` |
| Ingestion timeout on Vercel | LOW | Batch OpenAI calls; add `export const maxDuration = 60` to route; upgrade Vercel plan if needed |
| Bundled MCP assets stale | LOW | Copy updated docs from RAG repo, commit, push to MCP repo; bump version in README |
| TLS flag in application env | LOW | Remove from `.env` files and Vercel env vars; restart; test all HTTPS calls succeed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| IVFFlat on empty table | RAG App — Schema & Ingestion | `EXPLAIN` query shows index exists; `SELECT COUNT(*)` > 0 before index creation |
| Embedding dimension mismatch | RAG App — Schema & Ingestion | Runtime assertion in ingest script; first run logs `embedding.length === 1536` |
| Node path in mcp.json on Windows | MCP Server — Config & Windows Setup | New hire runs setup script; mcp.json contains absolute path; Copilot shows tools |
| ESM/CommonJS crash | MCP Server — Scaffold & Build | `node dist/index.js` exits cleanly in terminal before wiring to VSCode |
| NODE_TLS_REJECT_UNAUTHORIZED leaking | Both repos — Environment Setup | Grep all `.env` files and source code for this flag before deploying |
| Cosine distance vs similarity confusion | RAG App — Chat API & Retrieval | Integration test: exact-match query returns similarity > 0.9 |
| Chunking destroys context | RAG App — Ingestion Pipeline | Manual review of 5 random chunks — each must be self-contained with heading context |
| Vercel function timeout | RAG App — Ingestion & Deployment | Run ingest via curl against deployed URL; must complete in < 30 seconds |
| Bundled assets out of sync | MCP Server — Asset Bundling | README has explicit sync checklist; version marker in assets README |
| INGEST_SECRET bypass | RAG App — API Security | Test unauthenticated POST to `/api/ingest` in production returns non-2xx |

---

## Sources

- pgvector IVFFlat minimum rows and empty table behavior: [Stormatics — Understanding Indexes in pgvector](https://stormatics.tech/blogs/understanding-indexes-in-pgvector), [DEV Community — IVFFlat Indexing in pgvector](https://dev.to/azayshrestha/ivfflat-indexing-in-pgvector-2cj0)
- IVFFlat lists sizing guidelines: [Supabase — IVFFlat indexes](https://supabase.com/docs/guides/ai/vector-indexes/ivf-indexes), [AWS — pgvector indexing deep dive](https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/)
- MCP server Windows ESM path issues: [GitHub PR #13 — DesktopCommanderMCP](https://github.com/wonderwhy-er/DesktopCommanderMCP/pull/13), [Expo issue #41348](https://github.com/expo/expo/issues/41348), [MCP servers issue #1107](https://github.com/modelcontextprotocol/servers/issues/1107)
- MCP on Windows absolute path: [Fix spawn npx ENOENT in VSCode](https://julien.chable.net/fixing-spawn-npx-enoent-error-when-setting-up-azure-devops-mcp-server-in-vs-code), [VSCode MCP server docs](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- NODE_TLS_REJECT_UNAUTHORIZED risks: [HTTPToolkit — Node.js HTTPS vulnerability](https://httptoolkit.com/blog/node-https-vulnerability/), [Node.js TLS docs](https://nodejs.org/api/tls.html)
- NODE_EXTRA_CA_CERTS as safer alternative: [bobbyhadz — npm certificate error](https://bobbyhadz.com/blog/npm-err-unable-to-get-local-issuer-certificate)
- Cosine distance vs similarity in pgvector: [Supabase issue #12244](https://github.com/supabase/supabase/issues/12244), [pgvector issue #72](https://github.com/pgvector/pgvector/issues/72)
- RAG chunking pitfalls: [Weaviate — Chunking Strategies for RAG](https://weaviate.io/blog/chunking-strategies-for-rag), [Stack Overflow Blog — Breaking up is hard to do](https://stackoverflow.blog/2024/12/27/breaking-up-is-hard-to-do-chunking-in-rag-applications/)
- Vercel function timeout: [Vercel Community — 504 timeout](https://community.vercel.com/t/next-js-api-routes-returns-504-gateway-timeout-while-working-locally/9222), [Inngest — How to solve Next.js timeouts](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts)
- Vercel Postgres connection pooling: [Vercel KB — Connection Pooling with Functions](https://vercel.com/kb/guide/connection-pooling-with-functions)
- OpenAI text-embedding-3-small dimensions: [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- ts-node ESM issues: [TypeStrong/ts-node issue #2086](https://github.com/TypeStrong/ts-node/issues/2086)

---
*Pitfalls research for: Crowe AI Onboarding — RAG app + MCP server*
*Researched: 2026-03-06*
