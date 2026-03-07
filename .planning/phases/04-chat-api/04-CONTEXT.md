# Phase 4: Chat API - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the RAG chat endpoint: `src/app/api/chat/route.ts` accepts `{ message, history }`, embeds the query (incorporating recent history), retrieves top-5 chunks via cosine similarity, builds a GPT-4o completion with the PRD-specified system prompt, and returns `{ reply, sources }` with deduplicated sources. Phase ends when the endpoint returns grounded answers with source citations for on-topic queries and the exact fallback text for off-topic queries.

</domain>

<decisions>
## Implementation Decisions

### Route Schema
- Input: `POST /api/chat` with body `{ message: string, history: { role: 'user' | 'assistant', content: string }[] }`
- Output: `{ reply: string, sources: { docId: string, docTitle: string, similarity: number }[] }`
- Note: PRD uses `answer` field name; REQUIREMENTS.md and success criteria use `reply` — **`reply` wins** (matches success criteria and downstream Phase 5 contract)
- `export const maxDuration = 60` required (same lesson as Phase 3 — Vercel Hobby 10s default is too short for embed + retrieval + GPT-4o)

### Conversation History — Retrieval
- History **does** affect retrieval — it is NOT purely passed to GPT-4o
- Condensation approach: take the last 2 user messages from history + current message, join with newlines, embed the combined text as the retrieval query
- No separate LLM condensation call (adds latency with minimal benefit for this use case)
- Example: if history has ["what colors does Crowe use?", ...] and current is "what about typography?", embed "what colors does Crowe use?\nwhat about typography?" for better chunk retrieval
- If history is empty (first message), embed only the current message

### Conversation History — GPT-4o Context
- Full conversation history is passed to GPT-4o as the messages array (prior turns provide conversational context)
- Sliding window truncation: keep the most recent turns that fit within a 6 000-character budget for history (conservative limit; protects against runaway sessions while gpt-4o's 128k window handles extended conversations comfortably)
- Truncation is tail-based: drop oldest turns first, always include current message
- Phase 5 UI maintains history client-side (React state) and sends the full array with every POST — API is fully stateless (no sessions, no database)

### Model Configuration
- Model: `gpt-4o` (already the most capable OpenAI chat model; 128k context window)
- Made configurable via `OPENAI_MODEL` env var defaulting to `"gpt-4o"` — swap to a newer model without code changes
- `OPENAI_MODEL` should be added to `.env.example` with value `gpt-4o`
- All other settings locked: `temperature: 0.2`, `max_tokens: 800`, `stream: false`

### System Prompt
- Use verbatim from PRD (fully locked):
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
- Chunk separator: `\n\n---\n\n` between chunks in the context block
- Fallback: when no chunks meet 0.3 threshold, skip GPT-4o entirely and return `{ reply: "I don't have information on that in the knowledge base.", sources: [] }` directly

### Cosine Similarity / Retrieval
- Operator: `1 - (embedding <=> $1::vector) > 0.3` — comment in code MUST explain this is distance-to-similarity conversion (CHAT-03 success criterion requires visible comment)
- topK = 5, threshold = 0.3 (both locked from requirements)
- Retrieval query uses condensed history + current message (see above)
- Extract to `src/lib/retrieval.ts` — follows Phase 3 pattern of lib modules for reusable logic; route imports `retrieveChunks(queryText: string): Promise<RetrievedChunk[]>`

### Sources Deduplication
- Deduplicate by `docId` — one source entry per unique document, not per chunk
- When multiple chunks come from the same doc, keep the entry with the **highest similarity score**
- Sources sorted by similarity descending
- Maximum 5 unique sources (bounded by topK, fewer if chunks overlap in the same doc)
- Sources returned as `{ docId, docTitle, similarity }[]` — Phase 5 constructs clickable links from `docId` (e.g., link to the raw markdown on GitHub or render inline)

### Architecture
- `src/lib/retrieval.ts` — exports `retrieveChunks(queryText: string): Promise<RetrievedChunk[]>` — pure DB query, no embedding
- `src/app/api/chat/route.ts` — orchestrates: condense history → embedText() → retrieveChunks() → truncate history → build messages → GPT-4o → deduplicate sources → return response
- Reuses `embedText()` from `src/lib/embeddings.ts` (already exists, single-text variant)
- Reuses `sql` from `src/lib/db.ts` (in retrieval.ts)

### Claude's Discretion
- Exact TypeScript interfaces for `RetrievedChunk` and the history truncation logic
- Whether to add a `RetrievedChunk` type in retrieval.ts or inline in the route
- Exact character count implementation for history sliding window

</decisions>

<specifics>
## Specific Ideas

- The `OPENAI_MODEL` env var is the escape hatch for model upgrades — add to `.env.example` documented as `# Override default model (default: gpt-4o)`
- The 6 000-character history budget is conservative: at ~4 chars/token that's ~1 500 tokens of history, leaving ample room in gpt-4o's 128k context. Adjust upward if needed.
- Clickable sources in Phase 5: the `docId` (e.g., `05-branding`) maps to `docs/05-branding.md`. Phase 5 decides how to surface this (GitHub link, inline panel, etc.) — Phase 4 just ensures `docId` and `docTitle` are always present.
- `maxDuration = 60` goes at top of route.ts as first export — same placement as Phase 3 route.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/embeddings.ts`: `embedText(text: string) → Promise<number[]>` — use directly for query embedding
- `src/lib/db.ts`: exports `sql` tagged template — use in `src/lib/retrieval.ts`
- `src/lib/ingest.ts`: reference for `sql` usage pattern and `JSON.stringify(embedding)::vector` cast

### Established Patterns
- All lib modules extracted from routes (ingest.ts, chunker.ts, embeddings.ts) — retrieval.ts follows same pattern
- `sql` tagged template for all Neon queries — no raw string concatenation
- `export const maxDuration = 60` as first top-level export in route files
- Env vars loaded at runtime — no dotenv in lib files (Next.js handles this in route context)

### Integration Points
- `doc_chunks` table → queried by `src/lib/retrieval.ts`
- IVFFlat index (`doc_chunks_embedding_idx`) → already built by Phase 3, queried automatically by pgvector
- Phase 5 chat UI → POSTs to `/api/chat`, receives `{ reply, sources }`, maintains history in React state

</code_context>

<deferred>
## Deferred Ideas

- Streaming responses (`stream: true`) — deferred; `stream: false` sufficient for v1 and avoids SSE complexity in Phase 5
- Server-side session storage for conversation history — not needed; client-side state is sufficient for a single-user onboarding tool
- Clickable source rendering details (GitHub links, inline doc viewer, modal panel) — deferred to Phase 5 which owns the UI
- Larger history budget or dynamic token counting — gpt-4o 128k window makes this a non-issue in practice; revisit if context costs become a concern

</deferred>

---

*Phase: 04-chat-api*
*Context gathered: 2026-03-07*
