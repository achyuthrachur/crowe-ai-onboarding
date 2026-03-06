# Architecture Research

**Domain:** RAG chat application + local MCP server (developer tooling)
**Researched:** 2026-03-06
**Confidence:** HIGH (patterns verified against official docs and multiple implementations)

## Standard Architecture

### System Overview

Two independent systems share a common knowledge base (8 markdown docs) and serve the same audience (new Crowe AI practice hires) through different access surfaces.

```
  NEW HIRE BROWSER                      NEW HIRE VSCODE + COPILOT
  ┌─────────────────────┐               ┌────────────────────────────┐
  │   Next.js Chat UI   │               │  GitHub Copilot / Agent    │
  │  (crowe-ai-onboarding)│             │  (reads .vscode/mcp.json)  │
  └────────┬────────────┘               └────────────┬───────────────┘
           │ HTTP                                    │ stdio (JSON-RPC)
           ▼                                         ▼
  ┌─────────────────────┐               ┌────────────────────────────┐
  │  Next.js API Routes │               │  crowe-mcp-server          │
  │  /api/chat          │               │  (local Node.js process)   │
  │  /api/ingest        │               │  10 tools registered       │
  └────────┬────────────┘               └────────────┬───────────────┘
           │                                         │ reads
           ▼                                         ▼
  ┌─────────────────────┐               ┌────────────────────────────┐
  │  Vercel Postgres    │               │  Bundled /assets/ folder   │
  │  pgvector extension │               │  (8 md docs + project READMEs)│
  │  doc_chunks table   │               └────────────────────────────┘
  │  ivfflat index      │
  └─────────────────────┘
           │ embed via
           ▼
  ┌─────────────────────┐
  │  OpenAI API         │
  │  text-embedding-    │
  │  3-small (ingest)   │
  │  gpt-4o (chat)      │
  └─────────────────────┘
```

### Component Responsibilities

**System 1: RAG App (crowe-ai-onboarding)**

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Chat UI (`app/page.tsx`) | Renders message history, starter prompts, source chips, markdown | `/api/chat` via fetch |
| Ingest API (`app/api/ingest/route.ts`) | Accepts POST with INGEST_SECRET, chunks docs, embeds, upserts to pgvector | OpenAI embeddings, Vercel Postgres |
| Chat API (`app/api/chat/route.ts`) | Embeds user query, runs cosine search, builds prompt, calls gpt-4o | OpenAI embeddings + completions, Vercel Postgres |
| Embedding utility (`lib/embeddings.ts`) | Wraps OpenAI `text-embedding-3-small`, returns 1536-dim float[] | OpenAI API |
| DB client (`lib/db.ts`) | Vercel Postgres connection, vector similarity queries | Vercel Postgres (pgvector) |
| Chunker (`lib/chunker.ts`) | Splits markdown by heading/token boundary, attaches metadata | None (pure function) |

**System 2: MCP Server (crowe-mcp-server)**

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Entry point (`src/index.ts`) | Instantiates McpServer, registers tools, connects StdioServerTransport | SDK, all tool handlers |
| Tool handlers (`src/tools/*.ts`) | One file per logical tool group (docs, projects), implements search/read logic | `/assets/` files via fs |
| Asset loader (`src/assets.ts`) | Resolves asset paths (bundled default vs ASSETS_PATH env override) | Node.js `fs`, `path` |
| Bundled assets (`assets/`) | Committed copies of the 8 docs + 7 project READMEs | Read-only at runtime |

## Recommended Project Structure

**System 1: crowe-ai-onboarding**

```
crowe-ai-onboarding/
├── app/
│   ├── page.tsx                  # Chat UI root page
│   ├── layout.tsx                # Root layout with Crowe branding shell
│   ├── globals.css               # Tailwind base + brand tokens
│   └── api/
│       ├── chat/
│       │   └── route.ts          # POST /api/chat — retrieve + generate
│       └── ingest/
│           └── route.ts          # POST /api/ingest — chunk + embed + store
├── components/
│   ├── chat-interface.tsx        # Full chat surface (messages + input)
│   ├── message-bubble.tsx        # Renders user/assistant turns, markdown
│   ├── source-chip.tsx           # Clickable source citation badge
│   └── starter-prompts.tsx       # 4 suggested questions on empty state
├── lib/
│   ├── db.ts                     # Vercel Postgres client + pgvector helpers
│   ├── embeddings.ts             # OpenAI text-embedding-3-small wrapper
│   ├── chunker.ts                # Markdown → chunks with metadata
│   └── prompt.ts                 # System prompt builder (chunks → context)
├── docs/                         # Source markdown docs (01–08) for ingest
├── scripts/
│   └── ingest.ts                 # Local CLI: node scripts/ingest.ts
├── CLAUDE.md                     # Brand/dev rules (required at project root)
├── DESIGN.md                     # Visual spec (required at project root)
└── .env.local                    # OPENAI_API_KEY, POSTGRES_URL, INGEST_SECRET
```

**System 2: crowe-mcp-server**

```
crowe-mcp-server/
├── src/
│   ├── index.ts                  # McpServer init, tool registration, stdio connect
│   ├── assets.ts                 # Path resolver (bundled vs ASSETS_PATH env)
│   └── tools/
│       ├── docs.ts               # search_docs, get_doc, list_docs tools
│       └── projects.ts           # list_projects, get_project_readme tools
├── assets/
│   ├── docs/                     # Committed copies of 8 markdown docs
│   └── projects/                 # Committed copies of 7 project READMEs
├── .vscode/
│   └── mcp.json                  # Pre-configured for VSCode + Copilot
├── CLAUDE.md
├── README.md                     # 5-minute new hire setup guide
└── tsconfig.json
```

### Structure Rationale

- **`app/api/`:** Next.js App Router convention; each subfolder is a route. Keeps API and UI co-located in one repo.
- **`lib/`:** Shared utilities used by both API routes. Not `utils/` — `lib/` signals "production library code," not one-off helpers.
- **`scripts/`:** Local-only ingestion runner kept separate from app routes. Excluded from Vercel build via `tsconfig` exclusion.
- **`src/tools/`:** One file per logical domain in the MCP server keeps tool count manageable. Each file exports handler functions imported by `index.ts`.
- **`assets/`:** Committed to repo so `git clone && npm install && npm run dev` is the complete setup for new hires. No external path dependency.

## Architectural Patterns

### Pattern 1: Two-Phase RAG (Offline Ingest + Online Retrieve)

**What:** RAG separates work into an offline ingestion phase (run once, or on doc updates) and an online retrieval phase (run on every chat request). Ingestion is expensive (embedding API calls); retrieval is cheap (vector similarity query).

**When to use:** Any system where the knowledge base is stable between updates. This project has 8 static docs — perfect fit.

**Trade-offs:** Ingestion must be re-run when docs change. For this project, `npm run ingest` triggered manually is acceptable (listed as out of scope for automation).

**Example — Ingest route:**
```typescript
// app/api/ingest/route.ts
export async function POST(req: Request) {
  const { authorization } = await req.headers
  if (authorization !== process.env.INGEST_SECRET) return new Response('Unauthorized', { status: 401 })

  const chunks = await chunkAllDocs()        // load docs/ → split by heading
  for (const chunk of chunks) {
    const embedding = await embed(chunk.text) // OpenAI text-embedding-3-small
    await upsertChunk({ ...chunk, embedding }) // INSERT INTO doc_chunks ...
  }
  return Response.json({ ingested: chunks.length })
}
```

**Example — Chat route:**
```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json()
  const userQuery = messages.at(-1).content
  const queryEmbedding = await embed(userQuery)
  const chunks = await retrieveTopK(queryEmbedding, 5, 0.3) // cosine, threshold 0.3
  if (chunks.length === 0) return Response.json({ reply: "I don't have information on that." })
  const prompt = buildPrompt(chunks, userQuery)
  const reply = await openai.chat.completions.create({ model: 'gpt-4o', messages: prompt })
  return Response.json({ reply: reply.choices[0].message.content, sources: chunks.map(c => c.source) })
}
```

### Pattern 2: MCP Server with Registered Tool Handlers

**What:** The `@modelcontextprotocol/sdk` McpServer class handles the JSON-RPC 2.0 protocol. You register tools with name + description + Zod input schema. The host (Copilot) discovers tools via `tools/list` and invokes them via `tools/call`. Your handler receives validated input and returns `{ content: [{ type: 'text', text: string }] }`.

**When to use:** Any local developer tool surface. Stdio transport means no network, no auth, no port conflicts.

**Trade-offs:** Stdio transport only works locally. Works perfectly for this use case. The server process is spawned and killed by the host — it must not depend on persistent state between calls.

**Example — Tool registration:**
```typescript
// src/index.ts
const server = new McpServer({ name: 'crowe-mcp-server', version: '1.0.0' })

server.tool(
  'search_docs',
  'Keyword search across all Crowe AI practice docs',
  { query: z.string().describe('Search term') },
  async ({ query }) => {
    const results = await searchDocs(query)
    return { content: [{ type: 'text', text: JSON.stringify(results) }] }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
// IMPORTANT: never console.log() — it corrupts the JSON-RPC stdout stream
// Use console.error() for debug output (goes to stderr)
```

### Pattern 3: Client-Side State for Conversation History

**What:** Chat message history lives in React state (`useState`), not a database. Each API call to `/api/chat` receives the full message array from the client. The server is stateless between requests.

**When to use:** When multi-user isolation is not needed. This project is public-access (no auth), so server-side history would only add complexity with no benefit.

**Trade-offs:** History is lost on page refresh. Explicitly out of scope per PROJECT.md. Simplifies the API route significantly — no session management.

## Data Flow

### RAG Ingestion Flow (Offline — Run Once)

```
Markdown files (docs/01–08)
    ↓  chunker.ts splits by heading, ~500 tokens per chunk
Text chunks + metadata (source filename, chunk index)
    ↓  embeddings.ts → OpenAI text-embedding-3-small API
Float[1536] embedding vectors
    ↓  db.ts → INSERT INTO doc_chunks (content, embedding, source, chunk_index)
Vercel Postgres (pgvector)
    ↓  CREATE INDEX ivfflat (embedding vector_cosine_ops) WITH (lists=100)
Index built — retrieval ready
```

### RAG Chat Request Flow (Online — Every Request)

```
User types message → React state → POST /api/chat { messages }
    ↓
Chat API Route receives user query string
    ↓  embeddings.ts → OpenAI text-embedding-3-small
Query embedding Float[1536]
    ↓  db.ts → SELECT content, source, 1-(embedding<=>$1) AS score
              WHERE 1-(embedding<=>$1) > 0.3
              ORDER BY embedding<=>$1 LIMIT 5
Top-K chunks (≤5) with cosine similarity scores
    ↓  If 0 chunks: return "I don't have information on that"
    ↓  prompt.ts builds system prompt: [Crowe context] + [chunk texts] + [user query]
OpenAI gpt-4o completions API
    ↓
Answer text + source citations
    ↓
Response JSON { reply, sources } → React state → message-bubble.tsx renders
Source chips rendered below assistant message
```

### MCP Tool Request Flow (Runtime — Every Copilot Call)

```
Developer types prompt in Copilot / agent mode
    ↓
GitHub Copilot reads .vscode/mcp.json → spawns crowe-mcp-server process
    ↓  JSON-RPC: tools/list request via stdin
src/index.ts → returns registered tool schemas
    ↓
Copilot selects tool + constructs arguments
    ↓  JSON-RPC: tools/call { name: "search_docs", arguments: { query: "..." } }
Tool handler in src/tools/docs.ts
    ↓  fs.readFileSync from assets/ dir (bundled or ASSETS_PATH)
Keyword match across doc content
    ↓
{ content: [{ type: "text", text: "..." }] } via stdout
    ↓
Copilot receives result, incorporates into response
```

### Key Data Flows Summary

1. **Ingestion (one-time):** `docs/*.md` → chunker → OpenAI embed → pgvector store
2. **Chat query:** user input → embed → pgvector cosine search → prompt build → gpt-4o → response with citations
3. **MCP tool call:** Copilot stdin → JSON-RPC parse → tool handler → fs read → stdout response
4. **Threshold gate:** similarity < 0.3 → reject chunk → prevents hallucination on out-of-domain questions

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI API | REST via `openai` npm package | Used for both embedding and chat completion. Single API key for both. |
| Vercel Postgres | `@vercel/postgres` SQL tagged template | pgvector extension must be enabled. `<=>` operator for cosine distance. |
| GitHub Copilot | Spawns MCP server process, communicates via stdio | Configured via `.vscode/mcp.json` at project root. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Chat UI ↔ Chat API | `fetch` POST, JSON request/response | No streaming — static response is sufficient per PROJECT.md. |
| Chat API ↔ DB | `@vercel/postgres` SQL | pgvector `<=>` cosine distance operator. Threshold enforced in WHERE clause. |
| Chat API ↔ OpenAI | `openai` SDK REST calls | Two separate calls per chat request: one embed, one completion. |
| MCP Entry ↔ Tool Handlers | Direct TypeScript function calls | No message passing — all in same process. |
| MCP Server ↔ Assets | Node.js `fs` synchronous reads | Assets are static files; sync reads are fine for a local CLI tool. |
| crowe-ai-onboarding ↔ crowe-mcp-server | No runtime coupling | Two separate repos with no shared runtime dependency. Both consume same source docs independently. |

## Build Order

The two systems have a clear dependency ordering. The MCP server is simpler and provides faster feedback on whether the knowledge base content is useful, but the RAG app requires infrastructure setup that should be done first.

### Recommended Build Sequence

```
Phase 1: Foundation (shared across both)
  ├── CLAUDE.md + DESIGN.md at both project roots (prerequisite gating rule)
  ├── Vercel Postgres provisioned + pgvector extension enabled
  └── OpenAI API key confirmed working

Phase 2: RAG App — Infrastructure
  ├── Next.js 14 project scaffold (App Router, TypeScript, Tailwind, shadcn/ui)
  ├── DB schema: CREATE TABLE doc_chunks + ivfflat index
  ├── lib/db.ts + lib/embeddings.ts (pure utilities, independently testable)
  └── lib/chunker.ts (no external deps, pure function)

Phase 3: RAG App — Ingestion Pipeline
  ├── /api/ingest route with INGEST_SECRET guard
  ├── scripts/ingest.ts local runner
  └── Ingest all 8 docs → verify row count in Postgres

Phase 4: RAG App — Chat API
  ├── /api/chat route: embed query → cosine search → prompt build → gpt-4o
  ├── Threshold logic (< 0.3 → no-answer response)
  └── Source citation extraction

Phase 5: RAG App — Chat UI
  ├── chat-interface.tsx with message history (client state)
  ├── message-bubble.tsx with markdown rendering
  ├── source-chip.tsx
  └── starter-prompts.tsx (4 seed questions)

Phase 6: RAG App — Deployment
  ├── Vercel deploy with env vars
  ├── Production ingest run
  └── Lighthouse audit

Phase 7: MCP Server — Core
  ├── Node.js/TypeScript scaffold (no framework)
  ├── @modelcontextprotocol/sdk dependency
  ├── src/index.ts: McpServer + StdioServerTransport
  └── src/assets.ts: bundled path resolver

Phase 8: MCP Server — Tools
  ├── src/tools/docs.ts: search_docs, get_doc, list_docs
  ├── src/tools/projects.ts: list_projects, get_project_readme
  └── Verify tool count = 10

Phase 9: MCP Server — Integration + Polish
  ├── .vscode/mcp.json pre-configured
  ├── Windows compatibility (Git Bash + PowerShell)
  └── New hire README with 5-minute setup guide
```

**Dependency rationale:**
- Ingestion (Phase 3) must run before Chat API (Phase 4) can be tested with real data.
- Chat API (Phase 4) must work correctly before building Chat UI (Phase 5) — prevents debugging UI and API logic simultaneously.
- MCP server (Phases 7-9) is independent of the RAG app at runtime but shares the same source docs — it can be built after the RAG app is validated.
- Both systems share no runtime coupling, so MCP server phases can begin as soon as the RAG app is deployed.

## Anti-Patterns

### Anti-Pattern 1: Writing to stdout in the MCP Server

**What people do:** Use `console.log()` for debugging inside MCP tool handlers.

**Why it's wrong:** The MCP stdio transport uses stdout exclusively for JSON-RPC 2.0 message framing. Any non-protocol bytes written to stdout corrupt the message stream and cause the host (Copilot) to fail silently or crash the connection.

**Do this instead:** Use `console.error()` for all debug output (writes to stderr, which the host ignores).

### Anti-Pattern 2: Streaming Responses When Not Needed

**What people do:** Use the Vercel AI SDK `useChat` with streaming because tutorials show it.

**Why it's wrong:** Streaming adds implementation complexity (SSE, partial JSON, `ReadableStream`). PROJECT.md explicitly lists streaming as out of scope. A standard `fetch` + `Response.json()` is simpler, easier to test, and sufficient for this use case.

**Do this instead:** Standard POST to `/api/chat`, return `Response.json({ reply, sources })`.

### Anti-Pattern 3: Relying on Live File Paths in MCP Server

**What people do:** Reference docs via absolute paths configured in mcp.json or hard-coded for their machine.

**Why it's wrong:** New hires clone the repo to a different path. Hard-coded or developer-machine-specific paths fail immediately on any other machine.

**Do this instead:** Bundle docs in `assets/` at the repo root. Resolve paths relative to `__dirname` (or `import.meta.url`). Allow override via `ASSETS_PATH` env var for power users.

### Anti-Pattern 4: Retrieving Chunks Without a Similarity Threshold

**What people do:** Always return top-K results regardless of similarity score.

**Why it's wrong:** When the user asks something outside the knowledge base, the top results may have very low similarity (0.1–0.2). Feeding irrelevant chunks to gpt-4o causes confident hallucination grounded in wrong context.

**Do this instead:** Enforce a minimum similarity score (0.3 per PROJECT.md). If no chunks meet the threshold, return a canned "I don't have information on that" response.

## Scaling Considerations

This project targets a small internal audience (new hires), not public scale. Realistic usage is tens of users, not thousands.

| Concern | At current scale (10-50 users) | If scaled (500+ users) |
|---------|-------------------------------|------------------------|
| Vector search | IVFFlat (lists=100) is sufficient for 8 docs × ~50 chunks each | Switch to HNSW index for better recall at higher vector counts |
| Chat API | Single gpt-4o call per request, no caching needed | Add Redis cache for repeated identical queries |
| Ingestion | Manual `npm run ingest` is fine | Add webhook-triggered ingest on doc updates |
| MCP Server | Spawned locally per developer — zero infra concern | Not applicable (local-only by design) |

### Scaling Priorities

1. **First bottleneck (if it ever arises):** OpenAI API rate limits. Mitigation: add exponential backoff retry in `lib/embeddings.ts`.
2. **Second bottleneck:** Vercel Postgres connection pool exhaustion. Mitigation: use connection pooling (Vercel Postgres handles this automatically via Neon).

## Sources

- [pgvector GitHub — IVFFlat indexing and cosine distance](https://github.com/pgvector/pgvector)
- [AWS: IVFFlat vs HNSW techniques for pgvector](https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/)
- [MCP TypeScript SDK — official](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP: Build a server — official docs](https://modelcontextprotocol.io/docs/develop/build-server)
- [RAG Pipeline Deep Dive: Ingestion, Chunking, Embedding, Vector Search](https://medium.com/@derrickryangiggs/rag-pipeline-deep-dive-ingestion-chunking-embedding-and-vector-search-abd3c8bfc177)
- [Next.js 14 App Router project structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Tool-Augmented RAG Chatbot: GPT-4, pgVector & Next.js](https://blogs.perficient.com/2025/07/25/tool-augmented-rag-chatbot/)
- [MCP JSON-RPC message types reference](https://portkey.ai/blog/mcp-message-types-complete-json-rpc-reference-guide/)

---
*Architecture research for: Crowe AI Onboarding System (RAG app + MCP server)*
*Researched: 2026-03-06*
