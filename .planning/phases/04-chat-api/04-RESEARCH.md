# Phase 4: Chat API - Research

**Researched:** 2026-03-07
**Domain:** RAG retrieval, pgvector cosine similarity, OpenAI GPT-4o completion, Next.js App Router API routes
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Route Schema**
- Input: `POST /api/chat` with body `{ message: string, history: { role: 'user' | 'assistant', content: string }[] }`
- Output: `{ reply: string, sources: { docId: string, docTitle: string, similarity: number }[] }`
- `reply` field name wins over `answer` — matches success criteria and Phase 5 contract
- `export const maxDuration = 60` required as first top-level export

**Conversation History — Retrieval**
- Condensation: last 2 user messages from history + current message, joined with `\n`, embedded as single query string
- No separate LLM condensation call
- If history is empty, embed only the current message

**Conversation History — GPT-4o Context**
- Full conversation history passed to GPT-4o messages array
- Sliding window: 6 000-character budget, drop oldest turns first, always include current message
- API is fully stateless — no sessions, no database

**Model Configuration**
- Model: `gpt-4o` via `OPENAI_MODEL` env var defaulting to `"gpt-4o"`
- `OPENAI_MODEL` added to `.env.example` with value `gpt-4o`
- All locked: `temperature: 0.2`, `max_tokens: 800`, `stream: false`

**System Prompt** (verbatim, locked)
```
You are the Crowe AI Practice onboarding assistant. You help new team members
understand the tools, stack, branding standards, and workflows used on the team.

Answer questions using ONLY the context provided below. If the context doesn't
contain enough information to answer confidently, say so clearly.

When referencing specific values (colors, class names, commands), quote them
exactly as they appear in the context.

Context:
---
{retrieved_chunks_joined_with_separator}
---
```
- Chunk separator: `\n\n---\n\n` between chunks
- Fallback (no chunks meet threshold): skip GPT-4o, return `{ reply: "I don't have information on that in the knowledge base.", sources: [] }`

**Cosine Similarity / Retrieval**
- Operator: `1 - (embedding <=> $1::vector) > 0.3` — code comment MUST explain distance-to-similarity conversion
- topK = 5, threshold = 0.3
- Extract to `src/lib/retrieval.ts` with `retrieveChunks(queryText: string): Promise<RetrievedChunk[]>`

**Sources Deduplication**
- Deduplicate by `docId` — one entry per unique document
- Keep highest similarity score when multiple chunks from same doc
- Sort by similarity descending
- Return `{ docId, docTitle, similarity }[]`

**Architecture**
- `src/lib/retrieval.ts` — pure DB query, no embedding
- `src/app/api/chat/route.ts` — orchestrates full pipeline
- Reuses `embedText()` from `src/lib/embeddings.ts`
- Reuses `sql` from `src/lib/db.ts`

### Claude's Discretion
- Exact TypeScript interfaces for `RetrievedChunk` and the history truncation logic
- Whether to add a `RetrievedChunk` type in retrieval.ts or inline in the route
- Exact character count implementation for history sliding window

### Deferred Ideas (OUT OF SCOPE)
- Streaming responses (`stream: true`)
- Server-side session storage for conversation history
- Clickable source rendering details (GitHub links, inline doc viewer, modal panel)
- Larger history budget or dynamic token counting
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | `src/app/api/chat/route.ts` — POST `/api/chat` accepts `{ message, history }`, returns `{ reply, sources }` | Route structure, Next.js App Router POST handler pattern from ingest route |
| CHAT-02 | Query embedding generated via `text-embedding-3-small` on incoming message | `embedText()` already exists in `src/lib/embeddings.ts` — direct reuse |
| CHAT-03 | Cosine similarity search using `1 - (embedding <=> $1::vector) > 0.3` with code comment | pgvector `<=>` operator + `::vector` cast pattern verified in ingest.ts; comment requirement locked |
| CHAT-04 | Top-5 chunks retrieved, filtered to similarity >= 0.3 | SQL LIMIT + WHERE clause with threshold; IVFFlat index already built by Phase 3 |
| CHAT-05 | When no chunks meet threshold, return exact fallback text | Early-return before GPT-4o call; fallback text is verbatim-locked |
| CHAT-06 | Source citations returned as `{ docId, docTitle, similarity }[]` with every reply | TypeScript reduce deduplication over RetrievedChunk array |
| CHAT-07 | gpt-4o completion with system prompt (`temperature: 0.2`, `max_tokens: 800`, `stream: false`) | OpenAI SDK `^6.27.0` already installed; messages array construction pattern |
| CHAT-08 | Manual test: "what colors does Crowe use?" returns answer with source from branding doc | Integration test via curl or fetch against running dev server |
</phase_requirements>

---

## Summary

Phase 4 assembles three existing components — `embedText()`, the Neon `sql` tag, and the OpenAI SDK — into a RAG pipeline. All dependencies are already installed and all patterns are established by Phase 3. The retrieval module (`src/lib/retrieval.ts`) is the only new library code; the route (`src/app/api/chat/route.ts`) is orchestration logic.

The two technically subtle pieces are: (1) the pgvector cosine similarity operator (`<=>` returns distance, not similarity — must convert with `1 - distance`) and (2) the `::vector` cast required because `@neondatabase/serverless` does not auto-cast `number[]` to the `vector` type. Both patterns are already proven in `src/lib/ingest.ts`.

No new npm packages are needed. No test framework is currently installed — Wave 0 must create the full Vitest infrastructure before implementation tests can run. Most Phase 4 verification is best done via manual curl/fetch against the running dev server, with lightweight unit tests covering the pure functions (history condensation, source deduplication, sliding window truncation).

**Primary recommendation:** Build `src/lib/retrieval.ts` first (pure, testable, no side effects), then wire in `src/app/api/chat/route.ts` as orchestration. Validate end-to-end with curl before marking complete.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@neondatabase/serverless` | `^1.0.2` | Neon Postgres with pgvector queries | Already installed; `sql` tag pattern proven in Phase 3 |
| `openai` | `^6.27.0` | Embeddings + GPT-4o completion | Already installed; same client used in embeddings.ts and ingest.ts |
| `next` | `16.1.6` | App Router API route (`route.ts`) | Project framework; POST handler pattern from ingest route |

### No New Dependencies
This phase requires zero new npm packages. All runtime dependencies (OpenAI SDK, Neon client) and all utilities (`embedText`, `sql`) already exist.

**Installation:**
```bash
# Nothing to install — all dependencies from Phase 2/3 cover Phase 4
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db.ts            # existing — exports sql tagged template
│   ├── embeddings.ts    # existing — exports embedText()
│   ├── ingest.ts        # existing — Phase 3
│   ├── chunker.ts       # existing — Phase 3
│   └── retrieval.ts     # NEW — exports retrieveChunks()
└── app/
    └── api/
        ├── ingest/
        │   └── route.ts # existing — Phase 3
        └── chat/
            └── route.ts # NEW — chat endpoint
```

### Pattern 1: pgvector Cosine Similarity Query

**What:** Query `doc_chunks` using pgvector's `<=>` operator (L2 distance in cosine-ops space). Convert distance to similarity by subtracting from 1. Apply threshold and LIMIT.

**Critical detail:** The `<=>` operator in pgvector returns cosine **distance** (0 = identical, 2 = opposite). To get cosine **similarity** (1 = identical, -1 = opposite), use `1 - (embedding <=> query)`. The threshold of 0.3 is a similarity floor, so the WHERE clause is `1 - (embedding <=> $1::vector) > 0.3`.

**Why `::vector` cast is required:** `@neondatabase/serverless` does not auto-cast JavaScript `number[]` to the Postgres `vector` type. The embedding must be serialized as a JSON string (`JSON.stringify(embedding)`) and then explicitly cast in the SQL using `::vector`. This is the same pattern proven in `ingest.ts` line 83.

**The `POSTGRES_URL_NON_POOLING` requirement:** `db.ts` uses this connection string, not `DATABASE_URL`. Pgbouncer (pooled connection) breaks pgvector session state. The retrieval query will fail silently or error on the pooled connection. Always use `POSTGRES_URL_NON_POOLING`.

```typescript
// src/lib/retrieval.ts
// Source: project pattern from src/lib/ingest.ts + pgvector docs
import { sql } from './db';

export interface RetrievedChunk {
  docId: string;
  docTitle: string;
  content: string;
  similarity: number;
}

export async function retrieveChunks(queryText: string): Promise<RetrievedChunk[]> {
  // embedText() is called by the route BEFORE calling retrieveChunks()
  // This function receives the pre-computed embedding as a number[]
  // (see Pattern 2 for the split — this function takes the embedding, not the text)
}
```

**Note on function signature:** The CONTEXT.md says `retrieveChunks(queryText: string)` but this creates a hidden dependency on embedText inside retrieval.ts. The alternative — passing `embedding: number[]` directly — keeps retrieval.ts a pure DB query with no OpenAI dependency. Either works; the tradeoff is documented in Open Questions. The locked signature from CONTEXT.md is `queryText: string`, so retrieval.ts calls `embedText()` internally OR the route pre-embeds and passes the vector. Either interpretation satisfies CHAT-02 and CHAT-03 — the planner should choose and document.

**Recommended SQL query pattern:**
```typescript
// Source: pgvector docs + @neondatabase/serverless pattern from ingest.ts
const rows = await sql`
  SELECT
    doc_id     AS "docId",
    doc_title  AS "docTitle",
    content,
    -- <=> is cosine DISTANCE (0=identical). Convert to similarity: 1 - distance.
    -- We filter on similarity > 0.3, not distance < 0.7, for readability.
    1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS similarity
  FROM doc_chunks
  WHERE 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) > 0.3
  ORDER BY similarity DESC
  LIMIT 5
`;
```

**IVFFlat index usage:** The index `doc_chunks_embedding_idx` (built in Phase 3) uses `vector_cosine_ops`. pgvector automatically uses this index for `<=>` queries when the query planner sees it as beneficial. No explicit index hints are needed. The `LIMIT 5` helps the planner choose the index over a seq scan.

### Pattern 2: Route Orchestration

**What:** The route owns the full pipeline — history condensation, embedding, retrieval, GPT-4o call, source deduplication, response.

**Orchestration order:**
```
1. Parse body: { message, history }
2. Condense history for retrieval query
3. embedText(condensedQuery) → queryEmbedding
4. retrieveChunks(queryEmbedding) → chunks
5. If chunks.length === 0 → return fallback immediately
6. Deduplicate chunks → sources[]
7. Truncate history to 6000-char sliding window
8. Build GPT-4o messages array
9. openai.chat.completions.create(...)
10. Return { reply, sources }
```

### Pattern 3: History Condensation for Retrieval

**What:** Extract the last 2 `user` role messages from history, append the current message, join with `\n`.

```typescript
// Source: CONTEXT.md decision — no external library needed
function condenseHistoryForRetrieval(
  history: { role: 'user' | 'assistant'; content: string }[],
  currentMessage: string
): string {
  const lastTwoUserTurns = history
    .filter(turn => turn.role === 'user')
    .slice(-2)
    .map(turn => turn.content);
  return [...lastTwoUserTurns, currentMessage].join('\n');
}
```

**Edge case — empty history:** `filter` returns `[]`, `slice` returns `[]`, join produces only `currentMessage`. No special case needed.

**Edge case — history has only assistant turns:** Same — filter returns `[]`, current message is the whole query.

### Pattern 4: History Sliding Window for GPT-4o Context

**What:** Truncate `history` array so total character count of all `content` fields stays within 6 000 chars. Drop oldest entries first. Always include the current message (added separately as the final user turn in the messages array).

```typescript
// Source: CONTEXT.md decision — pure TypeScript, no library needed
function truncateHistory(
  history: { role: 'user' | 'assistant'; content: string }[],
  maxChars: number = 6000
): { role: 'user' | 'assistant'; content: string }[] {
  let total = 0;
  const result: typeof history = [];
  // Walk from newest to oldest, keep turns that fit
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    total += turn.content.length;
    if (total > maxChars) break;
    result.unshift(turn); // prepend to maintain chronological order
  }
  return result;
}
```

**Why character count, not token count:** Avoids a tiktoken dependency. At ~4 chars/token, 6 000 chars ≈ 1 500 tokens — well within gpt-4o's 128k context. Conservative enough to never cause context overflow.

### Pattern 5: Source Deduplication

**What:** Given an array of `RetrievedChunk[]` (multiple chunks may share the same `docId`), reduce to one entry per `docId` keeping the highest similarity.

```typescript
// Source: standard TypeScript reduce pattern
function deduplicateSources(
  chunks: RetrievedChunk[]
): { docId: string; docTitle: string; similarity: number }[] {
  const map = chunks.reduce<Record<string, { docId: string; docTitle: string; similarity: number }>>(
    (acc, chunk) => {
      const existing = acc[chunk.docId];
      if (!existing || chunk.similarity > existing.similarity) {
        acc[chunk.docId] = {
          docId: chunk.docId,
          docTitle: chunk.docTitle,
          similarity: chunk.similarity,
        };
      }
      return acc;
    },
    {}
  );
  return Object.values(map).sort((a, b) => b.similarity - a.similarity);
}
```

### Pattern 6: GPT-4o Messages Array Construction

**What:** Build the OpenAI messages array from system prompt (with injected context), truncated history, and current user message.

```typescript
// Source: OpenAI SDK v6 docs + CONTEXT.md system prompt (verbatim)
const systemPrompt = `You are the Crowe AI Practice onboarding assistant. You help new team members
understand the tools, stack, branding standards, and workflows used on the team.

Answer questions using ONLY the context provided below. If the context doesn't
contain enough information to answer confidently, say so clearly.

When referencing specific values (colors, class names, commands), quote them
exactly as they appear in the context.

Context:
---
${chunks.map(c => c.content).join('\n\n---\n\n')}
---`;

const messages = [
  { role: 'system' as const, content: systemPrompt },
  ...truncatedHistory,
  { role: 'user' as const, content: message },
];

const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL ?? 'gpt-4o',
  messages,
  temperature: 0.2,
  max_tokens: 800,
  stream: false,
});

const reply = completion.choices[0].message.content ?? '';
```

### Pattern 7: Route Structure (from ingest route reference)

```typescript
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

// MUST be first top-level export — Vercel reads at build time
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // ...pipeline...
}
```

### Anti-Patterns to Avoid

- **Using `DATABASE_URL` instead of `POSTGRES_URL_NON_POOLING`:** Pgbouncer breaks pgvector. The retrieval query will fail. `db.ts` already enforces the right connection string — do not create a second db connection.
- **Calling `JSON.stringify(embedding)` without `::vector` cast:** `@neondatabase/serverless` does not auto-cast arrays to the `vector` Postgres type. Omitting the cast silently produces a wrong comparison or a runtime error.
- **Using `<=>` directly as similarity:** `<=>` is cosine distance (0 = identical). Forgetting the `1 - ...` wrapper means similarity is backwards — scores near 0 are closest, which inverts the threshold.
- **Putting `export const maxDuration` inside the handler:** Vercel reads this at build time as a module-level export. Inside the function it is dead code.
- **Calling GPT-4o before checking the fallback condition:** If no chunks pass the 0.3 threshold, skip the API call entirely and return the fallback. Calling GPT-4o on empty context produces hallucinated answers.
- **Re-embedding inside retrieval.ts if the route already embeds:** Double-embedding wastes an API call and adds 200-500ms latency. Embed once in the route, pass the vector to retrieval.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cosine similarity over vectors | Custom dot product in JS | pgvector `<=>` operator | IVFFlat index only accelerates `<=>` queries; JS-side calculation defeats the index |
| Token counting for history window | tiktoken or custom tokenizer | Character count (4 chars ≈ 1 token) | No dependency needed; conservative estimate is fine for 128k-window model |
| Conversation state management | Server-side sessions, Redis | Client sends full history array | PRD decision; stateless API is correct for single-user onboarding tool |
| Chat completion streaming | SSE / ReadableStream | `stream: false` | Deferred to v2; static JSON response is sufficient |

**Key insight:** The entire Phase 4 implementation is wiring of already-proven primitives. The risk is in the details (operator direction, cast syntax, fallback order) — not in choosing the wrong library.

---

## Common Pitfalls

### Pitfall 1: Cosine Operator Direction Confusion
**What goes wrong:** Developer uses `embedding <=> $1::vector < 0.7` (distance threshold) instead of `1 - (embedding <=> $1::vector) > 0.3` (similarity threshold). The query runs but returns wrong results — low-similarity chunks pass, high-similarity chunks may fail at the boundary.
**Why it happens:** pgvector docs show both forms; the `<=>` symbol implies "compare" but actually returns distance.
**How to avoid:** Always write `1 - (embedding <=> ...) AS similarity` in the SELECT and in the WHERE. The CONTEXT.md locked form is `1 - (embedding <=> $1::vector) > 0.3` — use verbatim.
**Warning signs:** Query returns chunks for clearly off-topic questions, or returns no chunks for clearly on-topic questions.

### Pitfall 2: Missing `::vector` Cast
**What goes wrong:** Passing `embedding` directly (as `number[]`) to the sql tag without `JSON.stringify(...) + ::vector`. Produces a Postgres type error at runtime: "operator does not exist: vector <=> text[]".
**Why it happens:** `@neondatabase/serverless` serializes JS arrays as Postgres arrays (`{0.1, 0.2, ...}`), not as vector literals (`[0.1, 0.2, ...]`).
**How to avoid:** Always use `${JSON.stringify(embedding)}::vector` — exact same pattern as ingest.ts line 83.
**Warning signs:** Runtime error from Neon on any retrieval query.

### Pitfall 3: maxDuration Export Position
**What goes wrong:** Moving `export const maxDuration = 60` inside the async handler function, or exporting it after the handler function. Vercel's build step fails to detect it and the function stays at the 10-second default. Long queries silently time out in production.
**Why it happens:** Developers sometimes move it "out of the way" at the bottom of the file.
**How to avoid:** First line of the file after imports, always. The ingest route establishes this pattern.

### Pitfall 4: Calling GPT-4o on Empty Context
**What goes wrong:** If the fallback check is placed after the GPT-4o call (or not placed at all), GPT-4o receives an empty context block and generates a hallucinated answer with no sources. The fallback requirement (CHAT-05) is violated.
**Why it happens:** Developer orders the pipeline as embed → retrieve → build-prompt → GPT-4o → check sources. The check must come before building the prompt.
**How to avoid:** Check `chunks.length === 0` immediately after `retrieveChunks()`. Return the fallback response before constructing any messages array.

### Pitfall 5: History Condensation Includes Assistant Turns
**What goes wrong:** If both user and assistant turns are included in the retrieval query string, the assistant's verbosity dominates and retrieval drifts toward previous answer vocabulary rather than the user's actual intent.
**Why it happens:** Developer filters `history` without specifying `.filter(t => t.role === 'user')`.
**How to avoid:** Filter to `role === 'user'` only when building the condensed retrieval query. The full (all roles) truncated history goes to GPT-4o context, not to the embedding.

### Pitfall 6: History Sliding Window Applied to Retrieved Chunks
**What goes wrong:** Developer accidentally truncates the chunks array instead of (or in addition to) the history array. Fewer chunks reach the system prompt, reducing answer quality.
**Why it happens:** Both arrays have similar shapes and are processed in sequence.
**How to avoid:** Named variables (`truncatedHistory` vs `chunks`) — never apply the window function to the chunks array.

---

## Code Examples

Verified patterns from existing codebase and official sources:

### Full SQL Retrieval Query
```typescript
// Source: pgvector operator docs + @neondatabase/serverless pattern from src/lib/ingest.ts
// <=> returns cosine DISTANCE [0, 2]. Similarity = 1 - distance.
// We threshold on similarity (> 0.3) and order by similarity (DESC).
const rows = await sql`
  SELECT
    doc_id    AS "docId",
    doc_title AS "docTitle",
    content,
    1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS similarity
  FROM doc_chunks
  WHERE 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) > 0.3
  ORDER BY similarity DESC
  LIMIT 5
` as { docId: string; docTitle: string; content: string; similarity: number }[];
```

### History Condensation (Retrieval Query Building)
```typescript
// Source: CONTEXT.md decision
function condenseHistoryForRetrieval(
  history: { role: 'user' | 'assistant'; content: string }[],
  currentMessage: string
): string {
  const lastTwoUserTurns = history
    .filter(t => t.role === 'user')
    .slice(-2)
    .map(t => t.content);
  return [...lastTwoUserTurns, currentMessage].join('\n');
}
// Edge case: empty history → returns currentMessage only (no special branch needed)
```

### History Sliding Window
```typescript
// Source: CONTEXT.md — drop oldest first, stay within 6000 chars, current message added separately
function truncateHistory(
  history: { role: 'user' | 'assistant'; content: string }[],
  maxChars: number = 6000
): { role: 'user' | 'assistant'; content: string }[] {
  let total = 0;
  const kept: typeof history = [];
  for (let i = history.length - 1; i >= 0; i--) {
    total += history[i].content.length;
    if (total > maxChars) break;
    kept.unshift(history[i]);
  }
  return kept;
}
```

### Source Deduplication
```typescript
// Source: standard TypeScript reduce — no library needed
function deduplicateSources(chunks: RetrievedChunk[]) {
  const map = chunks.reduce<Record<string, { docId: string; docTitle: string; similarity: number }>>(
    (acc, chunk) => {
      const prev = acc[chunk.docId];
      if (!prev || chunk.similarity > prev.similarity) {
        acc[chunk.docId] = { docId: chunk.docId, docTitle: chunk.docTitle, similarity: chunk.similarity };
      }
      return acc;
    },
    {}
  );
  return Object.values(map).sort((a, b) => b.similarity - a.similarity);
}
```

### Fallback Guard
```typescript
// Source: CONTEXT.md — skip GPT-4o entirely when no chunks pass threshold
const chunks = await retrieveChunks(queryEmbedding);
if (chunks.length === 0) {
  return NextResponse.json({
    reply: "I don't have information on that in the knowledge base.",
    sources: [],
  });
}
// Only reach GPT-4o call if chunks.length > 0
```

### OpenAI Completion (SDK v6 pattern)
```typescript
// Source: openai SDK ^6.27.0 installed in project
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL ?? 'gpt-4o',
  messages,          // system + truncated history + current user turn
  temperature: 0.2,
  max_tokens: 800,
  stream: false,
});
const reply = completion.choices[0].message.content ?? '';
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/postgres` | `@neondatabase/serverless` | Q4 2024 (deprecated) | Already using correct package |
| `DATABASE_URL` for pgvector | `POSTGRES_URL_NON_POOLING` | Q4 2024 | Pooled connections break pgvector — already handled in db.ts |
| OpenAI v4 `ChatCompletion.create` | OpenAI v6 `openai.chat.completions.create` | 2024 | v6 API already used in project |

**No deprecated patterns apply to Phase 4** — all dependencies are current and patterns are established by Phases 2-3.

---

## Open Questions

1. **`retrieveChunks` signature: `queryText: string` vs `embedding: number[]`**
   - What we know: CONTEXT.md specifies `retrieveChunks(queryText: string)` — this means retrieval.ts calls `embedText()` internally. The alternative is the route pre-embeds and passes the vector, keeping retrieval.ts a pure DB module.
   - What's unclear: Having `embedText()` inside retrieval.ts creates a hidden OpenAI dependency in what is described as a "pure DB query" module.
   - Recommendation: The planner should choose. `retrieveChunks(embedding: number[])` is the cleaner architecture (pure DB layer). If the locked signature `retrieveChunks(queryText: string)` must be honored verbatim, retrieval.ts will import embeddings.ts. Both satisfy CHAT-02 and CHAT-03.

2. **Typescript type assertion for `@neondatabase/serverless` query results**
   - What we know: The `sql` tag returns `NeonQueryResult` which is typed as `any[]` by default.
   - What's unclear: Whether to assert the full row type inline (`as RetrievedChunk[]`) or use a runtime validation step.
   - Recommendation: Use `as { docId: string; docTitle: string; content: string; similarity: number }[]` inline with the sql tag — same pattern used in ingest.ts. No runtime validation needed for an internal DB query we control.

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — this section is required.

### Test Framework

No test framework is currently installed (no vitest.config, no jest.config, no test script in package.json). Wave 0 must create the full test infrastructure.

| Property | Value |
|----------|-------|
| Framework | Vitest (matches CLAUDE.md Section 4.1 default stack) |
| Config file | `vitest.config.ts` — Wave 0 creates this |
| Quick run command | `npx vitest run src/lib/` |
| Full suite command | `npx vitest run` |

**Why Vitest over Jest:** CLAUDE.md Section 4.1 explicitly lists `Vitest + React Testing Library` as the default testing stack. No jest config currently exists.

**Install command (Wave 0):**
```bash
npm install -D vitest @vitejs/plugin-react
```

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Route exists, returns `{ reply, sources }` shape | manual smoke | `curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"what colors does Crowe use?","history":[]}'` | ❌ Wave 0 |
| CHAT-02 | Query embedding called via `text-embedding-3-small` | manual-only (requires live OpenAI) | Inspect Vercel/dev logs for OpenAI call | ❌ N/A |
| CHAT-03 | SQL uses `1 - (embedding <=> $1::vector) > 0.3` with code comment | code inspection | `grep -n "1 - (embedding <=>" src/lib/retrieval.ts` | ❌ Wave 0 |
| CHAT-04 | Top-5 returned, below-threshold filtered | unit (deduplication logic) + manual | `npx vitest run src/lib/retrieval.test.ts` (mock sql) | ❌ Wave 0 |
| CHAT-05 | Empty chunks → exact fallback text, no GPT-4o call | unit | `npx vitest run src/app/api/chat/route.test.ts` (mock retrieveChunks) | ❌ Wave 0 |
| CHAT-06 | Sources deduplicated by docId, highest similarity kept, sorted desc | unit | `npx vitest run src/lib/retrieval.test.ts` | ❌ Wave 0 |
| CHAT-07 | GPT-4o called with temperature:0.2, max_tokens:800, stream:false | manual-only (live API call) | Inspect completion object in dev logs | ❌ N/A |
| CHAT-08 | "what colors does Crowe use?" returns answer + branding source | manual integration | `curl` as above + inspect response JSON | ❌ N/A |

### Unit-Testable Pure Functions

Three functions in the pipeline are pure (no I/O) and fully unit-testable without mocking:

| Function | Test file | What to test |
|----------|-----------|--------------|
| `condenseHistoryForRetrieval` | `src/lib/retrieval.test.ts` | Empty history, 1 user turn, 3 user turns (takes last 2), mixed roles |
| `truncateHistory` | `src/lib/retrieval.test.ts` | Empty, fits within 6000, exceeds 6000, single long turn |
| `deduplicateSources` | `src/lib/retrieval.test.ts` | No duplicates, 2 chunks same doc (keep higher), sorted desc |

These can be extracted as named exports from `retrieval.ts` or placed in a `src/lib/chat-utils.ts` helper — either is testable.

### Integration Tests (require running server + live DB)

The following are manual-only due to live API and database dependencies. Automated equivalents would require expensive mocking of the Neon sql tag AND the OpenAI SDK, with high maintenance cost for minimal coverage gain.

```bash
# On-topic query path (CHAT-01, CHAT-02, CHAT-04, CHAT-07, CHAT-08)
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"what colors does Crowe use?","history":[]}' \
  | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
    console.assert(typeof d.reply === 'string', 'reply is string'); \
    console.assert(Array.isArray(d.sources), 'sources is array'); \
    console.assert(d.sources.length > 0, 'at least one source'); \
    console.assert(d.sources[0].docId, 'source has docId'); \
    console.log('PASS: on-topic query')"

# Fallback path (CHAT-05)
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"what is the capital of France?","history":[]}' \
  | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
    console.assert(d.reply === \"I don't have information on that in the knowledge base.\", 'fallback text exact'); \
    console.assert(d.sources.length === 0, 'no sources on fallback'); \
    console.log('PASS: fallback path')"

# Multi-turn history affects retrieval (CHAT-02, context carries)
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"what about typography?","history":[{"role":"user","content":"what colors does Crowe use?"},{"role":"assistant","content":"..."}]}' \
  | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
    console.assert(typeof d.reply === 'string', 'reply is string'); \
    console.log('PASS: multi-turn history')"
```

### CHAT-03 Code Inspection Command
```bash
# Verify cosine operator form and comment presence
grep -n "1 - (embedding" "$(pwd)/src/lib/retrieval.ts"
grep -n "distance" "$(pwd)/src/lib/retrieval.ts"
# Expected: line showing "1 - (embedding <=> ..." and line with "distance" comment
```

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/` (pure function unit tests, < 5 seconds)
- **Per wave merge:** `npx vitest run` (all unit tests)
- **Phase gate:** Unit tests green + all 3 manual curl checks pass before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — Vitest configuration file
- [ ] `npm install -D vitest @vitejs/plugin-react` — test framework install
- [ ] Add `"test": "vitest run", "test:watch": "vitest"` to `package.json` scripts
- [ ] `src/lib/retrieval.test.ts` — unit tests for pure functions (condense, truncate, deduplicate)
- [ ] `src/app/api/chat/route.test.ts` — unit test for fallback path (mock retrieveChunks to return [])

---

## Sources

### Primary (HIGH confidence)
- `src/lib/ingest.ts` — `JSON.stringify(embedding)::vector` cast pattern, `sql` tagged template usage, `maxDuration = 60` placement
- `src/lib/embeddings.ts` — `embedText()` function signature confirmed
- `src/lib/db.ts` — `POSTGRES_URL_NON_POOLING` requirement confirmed
- `src/app/api/ingest/route.ts` — route file structure, `maxDuration` export position, `NextRequest`/`NextResponse` imports
- `.planning/phases/04-chat-api/04-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- pgvector documentation: `<=>` is cosine distance operator, `1 - distance = similarity` — verified consistent with the ingest.ts IVFFlat configuration using `vector_cosine_ops`
- OpenAI SDK v6 `chat.completions.create` API shape — consistent with openai `^6.27.0` in package.json and usage in ingest.ts's `openai.embeddings.create`
- `@neondatabase/serverless` `^1.0.2` — sql tag behavior (no auto-cast of arrays to vector) confirmed by existing ingest.ts workaround

### Tertiary (LOW confidence)
- Vitest as the correct test framework — inferred from CLAUDE.md Section 4.1 default stack ("Vitest + React Testing Library"); no vitest.config currently exists to confirm project has adopted it

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and in use
- Architecture: HIGH — patterns directly replicated from Phase 3 ingest code
- Pitfalls: HIGH — cosine operator and vector cast issues directly observed in existing ingest.ts workarounds
- Validation architecture: MEDIUM — test framework choice inferred from CLAUDE.md, no existing vitest config to confirm

**Research date:** 2026-03-07
**Valid until:** 2026-09-07 (stable — all dependencies locked to exact versions in package.json; pgvector `<=>` operator is a stable API)
