# Project Research Summary

**Project:** Crowe AI Onboarding — RAG Chat App + MCP Server
**Domain:** Internal developer tooling — RAG-powered onboarding chatbot + local MCP server for GitHub Copilot
**Researched:** 2026-03-06
**Confidence:** MEDIUM-HIGH (stack constrained by PROJECT.md; architecture and pitfalls verified against official docs)

## Executive Summary

This project consists of two independent but complementary systems serving the same audience: new Crowe AI practice hires. The first is a RAG-powered chat application deployed on Vercel that answers onboarding questions grounded in 8 internal markdown documents. The second is a local MCP server that surfaces the same knowledge base as tools callable from GitHub Copilot's agent mode. Both systems are constrained by a PROJECT.md that fixes the technology choices — Next.js 14, OpenAI (gpt-4o + text-embedding-3-small), Vercel Postgres with pgvector, TypeScript, and stdio-only MCP transport. The recommended approach is to build the RAG app first (infrastructure is the critical path blocker), validate retrieval quality, then build the MCP server which shares the same source documents but has no runtime coupling to the RAG app.

The critical architectural insight is that the RAG pipeline separates into two phases: an offline ingestion pass (run once, or on doc updates) and an online retrieval pass (run on every chat request). Ingestion must complete before the chat API can be tested with real data, which must work before building the UI. This hard dependency chain dictates phase ordering. The MCP server is architecturally simpler — it uses synchronous filesystem reads on bundled assets rather than vector search — and can be built in parallel with or after the RAG app without runtime coupling.

The top risks are operational rather than architectural: the Crowe SSL proxy breaks all npm and Node.js HTTPS calls without the `NODE_TLS_REJECT_UNAUTHORIZED=0` workaround, which must be scoped to shell-only use and never allowed into application env vars. On Windows, the MCP server requires absolute Node.js paths in `.vscode/mcp.json` because VSCode's inherited PATH may not include user-scoped Node installations. The IVFFlat index must be created after ingestion, not in the schema migration, or it will be built on an empty table and silently ignored by the query planner.

---

## Key Findings

### Recommended Stack

The stack is largely fixed by PROJECT.md, but research validated key implementation choices. The deprecated `@vercel/postgres` package must not be used — Vercel officially migrated to Neon and the correct driver is `@neondatabase/serverless`. For the MCP server, `tsx` is preferred over `ts-node` for development because ts-node requires complex ESM configuration on Windows; for production (the mcp.json command), the compiled `dist/index.js` should be used to avoid tsx startup latency. LangChain, Prisma, and the Vercel AI SDK are all explicitly excluded — they add abstraction that obscures direct OpenAI SDK calls and adds dependencies for no benefit at this project's scope.

**Core technologies:**
- **Next.js 14 (App Router):** App framework — PROJECT.md hard constraint; App Router is the correct paradigm for this use case
- **@neondatabase/serverless:** Postgres driver — `@vercel/postgres` is officially deprecated as of Q4 2024; this is the Vercel-recommended successor
- **openai ^6.27.0:** OpenAI client — latest stable March 2026; used for both embeddings.create() and chat.completions.create()
- **@modelcontextprotocol/sdk ^1.27.1:** MCP protocol — v1.x is stable; v2 is pre-alpha and not production-ready
- **zod ^3.x:** Schema validation — MCP SDK peer deps reference Zod 3 internally; do not upgrade to v4 without verifying compatibility
- **tsx ^4.x:** TypeScript dev runner — zero-config, ESM-compatible, works on Windows without gymnastics
- **react-markdown + rehype-highlight:** Markdown rendering — required for LLM output that includes headers, lists, and code blocks

### Expected Features

The RAG app and MCP server have distinct feature profiles, but both follow an "all or nothing" MVP principle — a partial feature set for either system produces a worse experience than a complete one.

**Must have — RAG App (table stakes):**
- Natural language Q&A with cosine similarity retrieval (top-5 chunks, 0.3 threshold) — the core product function
- Source citation chips on every answer — the primary trust signal; users expect this from any AI tool
- Explicit "I don't have information on that" fallback when similarity < 0.3 — prevents hallucination; threshold must be enforced in the API, not the UI
- Chat UI with Crowe branding (Indigo Dark + Amber), markdown rendering with code copy, loading state, error state — complete production experience
- 4 curated starter prompts on empty state — research shows blank input boxes cause first-time failure for new users
- Ingestion pipeline — the critical path blocker; nothing else can be tested until embeddings exist in pgvector

**Must have — MCP Server (table stakes):**
- All 10 tools with Zod-validated inputs and graceful error handling — partial tool sets confuse Copilot's routing
- Bundled assets committed to repo — clone-and-go is the core UX promise for developer tooling
- Pre-configured `.vscode/mcp.json` — Copilot cannot discover the server without it
- Windows-tested execution (Git Bash + PowerShell with absolute Node paths) — target platform
- Setup README with SSL proxy workaround as step 1 — saves each new hire 30+ minutes

**Defer to v2+:**
- Streaming responses — cosmetic benefit for 3-second responses; adds SSE/WebSocket complexity
- Feedback / thumbs-up-down — only useful with a feedback pipeline; don't collect data without a loop to act on it
- Admin UI for knowledge base editing — scope creep; git is the right editor for markdown in a repo
- HTTP/SSE transport for MCP — requires firewall rules and auth; stdio is correct for local developer tools

### Architecture Approach

Two independent systems share a common knowledge base but have no runtime coupling. The RAG app is a standard Next.js 14 App Router project with co-located API routes (`/api/chat`, `/api/ingest`), shared utilities in `lib/` (db.ts, embeddings.ts, chunker.ts, prompt.ts), and UI components in `components/`. The MCP server is a plain Node.js/TypeScript process with no framework — tools are registered with the MCP SDK's `McpServer` class and assets are bundled in `assets/` at the repo root. Both systems consume the same 8 markdown source documents independently, with no shared runtime dependency.

**Major components — RAG App:**
1. **Chat UI (`app/page.tsx` + components/)** — React client state for message history; fetches `/api/chat` via POST; renders markdown, source chips, starter prompts
2. **Chat API (`app/api/chat/route.ts`)** — embeds query, runs cosine search against pgvector, builds prompt, calls gpt-4o, returns `{ reply, sources }`
3. **Ingest API + script (`app/api/ingest/route.ts` + `scripts/ingest.ts`)** — chunks docs, batches embedding calls, upserts to pgvector, protected by INGEST_SECRET
4. **lib/ utilities** — `db.ts` (pgvector queries), `embeddings.ts` (OpenAI wrapper), `chunker.ts` (heading-aware markdown splitter), `prompt.ts` (system prompt builder)

**Major components — MCP Server:**
1. **Entry point (`src/index.ts`)** — instantiates McpServer, registers 10 tools, connects StdioServerTransport; `console.error()` only — stdout is JSON-RPC
2. **Tool handlers (`src/tools/docs.ts`, `src/tools/projects.ts`)** — keyword search and structured access to bundled assets; synchronous fs reads
3. **Asset loader (`src/assets.ts`)** — resolves paths: bundled default vs ASSETS_PATH env override for power users
4. **Bundled assets (`assets/`)** — committed copies of 8 docs + 7 project READMEs; enables clone-and-go setup

### Critical Pitfalls

1. **IVFFlat index created before ingestion data exists** — Build index at end of ingestion script after all rows are inserted, not in the schema migration. A pre-ingestion index is silently useless; Postgres falls back to sequential scan with no error.

2. **MCP server fails on Windows: Node not on VSCode's PATH** — Use absolute Node path in `.vscode/mcp.json` (from `where node` in PowerShell). Provide a `scripts/generate-mcp-config.js` helper that writes the correct path automatically. `spawn node ENOENT` gives no user-visible error in Copilot.

3. **NODE_TLS_REJECT_UNAUTHORIZED=0 leaking into application env** — This flag disables TLS validation process-wide, including all OpenAI API calls. Keep it shell-only for CLI commands; never add to `.env` files, source code, or Vercel environment variables.

4. **ESM/CommonJS mismatch crashes MCP server on startup** — Compile to CommonJS (`"module": "CommonJS"` in tsconfig). The MCP SDK ships both formats; CJS avoids all Windows ESM resolution issues. Run `node dist/index.js`, never `ts-node src/index.ts`, in production/mcp.json.

5. **Vercel function timeout on ingest** — Batch all chunk texts in a single `openai.embeddings.create({ input: [...] })` call rather than one per chunk. A single batch call takes 1-2s versus 12+s sequential; Hobby plan times out at 10s. Set `export const maxDuration = 60` on the route.

6. **Cosine distance vs similarity operator confusion** — pgvector's `<=>` returns distance (0 = identical), not similarity. The correct similarity query is `1 - (embedding <=> $1::vector) > 0.3`, not a raw distance comparison. Write this explicitly in code comments.

7. **Chunking destroys context at section boundaries** — Use heading-aware chunking: split on `##` and `###` boundaries first, then by paragraph. Prepend document title and section heading to every chunk. Target 300-600 tokens per chunk with 50-token overlap.

---

## Implications for Roadmap

Research reveals a clear 9-phase build sequence with hard dependencies at the ingestion → chat API → chat UI boundary. The MCP server can begin after the RAG app is deployed and validated. Phase ordering should not be compressed — each phase gate exists to prevent debugging two systems simultaneously.

### Phase 1: Foundation and Infrastructure Setup
**Rationale:** Both systems share prerequisites: Vercel Postgres + pgvector provisioned, OpenAI API key confirmed, and CLAUDE.md + DESIGN.md present at both project roots (prerequisite gating rule from PROJECT.md). Nothing can be tested without this.
**Delivers:** Working database with pgvector extension enabled, environment variables set locally and in Vercel, brand/dev rules in place
**Addresses:** All RAG features depend on pgvector; all build steps depend on the OpenAI key
**Avoids:** NODE_TLS_REJECT_UNAUTHORIZED leaking — configure env vars correctly from day one with explicit documentation of what is shell-only vs application env

### Phase 2: RAG App Scaffold and Database Schema
**Rationale:** Next.js 14 project scaffold, DB schema (`doc_chunks` table only — no index yet), and pure lib/ utilities can be built and tested independently before any API integration. The chunker and embeddings wrapper have no external dependencies in their test paths.
**Delivers:** Next.js 14 App Router project, `doc_chunks` table (no index), `lib/db.ts`, `lib/embeddings.ts`, `lib/chunker.ts`
**Uses:** `@neondatabase/serverless`, `openai ^6.x`, TypeScript 5.x, shadcn/ui init
**Avoids:** IVFFlat index created before data — create the table only here; index creation belongs in Phase 3

### Phase 3: Ingestion Pipeline
**Rationale:** Ingestion is the critical path blocker. The chat API cannot be meaningfully tested until embeddings exist in pgvector. This phase must be fully validated (row count > 0, embedding dimension assertion passes, index built after data) before proceeding.
**Delivers:** `/api/ingest` route with INGEST_SECRET guard, `scripts/ingest.ts` local runner, all 8 docs embedded and stored, IVFFlat index built post-ingestion, embedding dimension assertion in code
**Addresses:** Ingestion pipeline (P1 feature), heading-aware chunking, source metadata stored per chunk for citations
**Avoids:** Vercel timeout — batch all chunk embeddings in a single OpenAI API call; INGEST_SECRET bypass — fail-closed check that rejects if env var is missing

### Phase 4: Chat API and Retrieval Logic
**Rationale:** With data in pgvector, the retrieval logic can be built and tested in isolation before the UI exists. This is the appropriate time to validate cosine similarity behavior, threshold enforcement, and source citation extraction.
**Delivers:** `POST /api/chat` route — embeds query, cosine similarity search, threshold gate at 0.3, prompt builder, gpt-4o completion, `{ reply, sources }` response
**Addresses:** Chat API retrieval (P1), source citations (P1), fallback below threshold (P1)
**Avoids:** Cosine distance vs similarity confusion — use `1 - (embedding <=> $1::vector) > 0.3` with a code comment explaining the operator

### Phase 5: Chat UI
**Rationale:** API correctness verified before building UI prevents debugging both layers simultaneously. UI is purely additive at this point — the API contract is fixed.
**Delivers:** `chat-interface.tsx`, `message-bubble.tsx` with markdown rendering, `source-chip.tsx`, `starter-prompts.tsx`, loading state, error state, Crowe branding (Indigo Dark + Amber per DESIGN.md)
**Addresses:** All table-stakes UI features (P1): markdown rendering, code copy button, loading state, error state, starter prompts, responsive layout
**Uses:** react-markdown + rehype-highlight, shadcn/ui Button/Card/Badge/Textarea, lucide-react, Tailwind

### Phase 6: RAG App Deployment and Validation
**Rationale:** Vercel deployment and production ingest run must be validated before MCP server work begins — the MCP server's bundled assets should match the most current docs, and the RAG app URL needs to exist for the new hire README.
**Delivers:** Deployed Vercel app, production ingest completed, Lighthouse audit >= 90, INGEST_SECRET validated in production (unauthenticated POST returns 401/500)
**Addresses:** Vercel deployment (P1), live ingestion route
**Avoids:** INGEST_SECRET bypass in production, NODE_TLS_REJECT_UNAUTHORIZED in Vercel env vars

### Phase 7: MCP Server Scaffold and Asset Bundling
**Rationale:** MCP server has no runtime dependency on the RAG app. It can begin here with a clean scaffold and bundled assets copied from the validated RAG docs.
**Delivers:** Node.js/TypeScript scaffold with `"type": "module"` omitted (CommonJS output), `@modelcontextprotocol/sdk` dependency, `src/assets.ts` path resolver, `assets/` folder with committed copies of all 8 docs + 7 project READMEs
**Uses:** `@modelcontextprotocol/sdk ^1.27.1`, `zod ^3.x`, `tsx ^4.x` for dev, CommonJS tsconfig
**Avoids:** ESM/CommonJS crash — compile to CJS from the start; bundled asset staleness — copy docs from RAG app at this point

### Phase 8: MCP Server Tool Implementation
**Rationale:** With scaffold, assets, and transport working, the 10 tools can be implemented. All tools must be implemented together — a partial tool set confuses Copilot's routing and erodes trust.
**Delivers:** `src/tools/docs.ts` (search_docs, get_doc, list_docs), `src/tools/projects.ts` (list_projects, get_project_readme + 5 per-asset tools), Zod validation on all inputs, graceful error handling (no unhandled throws — errors as data)
**Addresses:** Full 10-tool coverage (P1), search_docs as universal entry point, verb_noun naming convention, structured error responses

### Phase 9: MCP Server Integration, Windows Testing, and Polish
**Rationale:** Windows compatibility and Copilot discoverability cannot be assumed — they must be explicitly tested on the target platform. This phase also produces the developer-facing setup materials.
**Delivers:** Pre-configured `.vscode/mcp.json` with absolute Node path, `scripts/generate-mcp-config.js` auto-config helper, Windows Git Bash + PowerShell compatibility verified, setup README with SSL proxy workaround as step 1, `npm run build` → `node dist/index.js` validated in terminal before wiring to VSCode
**Addresses:** Windows compatibility (P1), clone-and-go setup (P1), 5-minute setup README (P1)
**Avoids:** Node PATH resolution failure — absolute path in mcp.json; MCP assets out of sync — README includes explicit sync checklist

### Phase Ordering Rationale

- **Phases 1-6 must be sequential** due to hard data dependency: schema → ingest → chat API → chat UI → deploy
- **Phases 7-9 can begin any time after Phase 6** — MCP server has no runtime coupling to RAG app; bundled assets should be copied from the now-validated doc set
- **Phase 3 (ingestion) is the single highest-risk phase** — it involves the most pitfalls (IVFFlat timing, batching, timeout, chunking quality, dimension mismatch) and gates everything downstream
- **Phase 4 (chat API) should be fully tested before Phase 5 (UI)** — this prevents the debugging antipattern of not knowing whether a wrong answer is a retrieval bug or a rendering bug

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Ingestion Pipeline):** Heading-aware chunking implementation details are not fully specified; token counting approach (character-based vs tiktoken) needs a decision; batch size limits for OpenAI embeddings API need verification
- **Phase 7 (MCP Scaffold):** CommonJS vs ESM final decision needs to be locked in at scaffold time; any deviation creates the ESM crash pitfall; research the exact tsconfig that produces clean CJS output compatible with the MCP SDK

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Infrastructure):** Neon pgvector setup is fully documented with official Neon docs; env var names are known
- **Phase 2 (RAG Scaffold):** Next.js 14 App Router scaffold is standard; shadcn/ui init is well-documented
- **Phase 5 (Chat UI):** react-markdown + rehype-highlight pattern is established; shadcn/ui component usage is documented
- **Phase 6 (Deployment):** Vercel deploy with env vars is standard; Lighthouse audit approach is known
- **Phase 8 (MCP Tools):** MCP SDK tool registration pattern is fully documented and verified

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core versions verified via WebSearch; WebFetch blocked by Crowe SSL proxy prevented direct npm page reads; @neondatabase/serverless deprecation of @vercel/postgres is HIGH confidence (official Neon docs); MCP SDK v1.27.1 is MEDIUM (WebSearch result, npm page returned 403) |
| Features | MEDIUM | Verified against official MCP docs and GitHub Copilot docs; feature necessity judgments are based on established RAG/chatbot patterns and competitor analysis, not user research with actual new hires |
| Architecture | HIGH | Two-phase RAG pattern is industry-standard and verified across multiple authoritative sources; MCP stdio architecture is verified against official MCP docs and VSCode docs; component boundaries are clearly derived from Next.js and MCP SDK conventions |
| Pitfalls | HIGH | Most pitfalls verified across multiple authoritative sources (pgvector GitHub, official MCP docs, Vercel community, Node.js TLS docs); Windows-specific issues verified against real GitHub issues |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Optimal chunk size and overlap:** Research recommends 300-600 tokens with 50-token overlap but does not validate this against the actual 8 Crowe docs. The chunker should be designed to make these parameters tunable. Validate by manually reviewing 5 random chunks during Phase 3.

- **IVFFlat `lists=100` with ~80-200 chunks:** PROJECT.md specifies lists=100, which is intentionally oversized for this data volume (recommended formula: rows/1000 ≈ 0.1). This means the index build is slower than necessary and the query planner may still prefer sequential scan. This is documented as an accepted tradeoff; note it in code comments.

- **MCP tool count (10 tools):** The research references "10 tools" as the target but does not enumerate all 10 explicitly. Before Phase 8, enumerate all 10 tools by name with their inputs and outputs. Missing tools at this stage would require a revision to the MVP definition.

- **Cosine similarity threshold (0.3) tuning:** The 0.3 threshold is fixed by PROJECT.md but has not been empirically validated against the actual document set. During Phase 4 testing, verify by querying with exact doc text (similarity should be > 0.9) and off-topic text (similarity should be < 0.3). If threshold needs adjustment, do it before Phase 5 (UI).

- **New hire Windows environment variability:** The MCP server pitfalls assume Node.js installed without admin rights via nvm-windows. The actual Crowe Windows environment (managed vs unmanaged machines, standard Node path) should be confirmed with one test user before Phase 9 is marked complete.

---

## Sources

### Primary (HIGH confidence)
- [Neon Docs — Vercel Postgres Transition Guide](https://neon.com/docs/guides/vercel-postgres-transition-guide) — @vercel/postgres deprecated; @neondatabase/serverless for new projects
- [Neon Docs — pgvector extension](https://neon.com/docs/extensions/pgvector) — ivfflat index setup, 1536 dimensions
- [MCP official docs — Build a server](https://modelcontextprotocol.io/docs/develop/build-server) — StdioServerTransport, console.error() requirement, tool registration
- [VSCode Docs — MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) — .vscode/mcp.json schema, stdio configuration
- [OpenAI API — text-embedding-3-small](https://platform.openai.com/docs/models/text-embedding-3-small) — 1536 dimensions, embeddings.create() API
- [pgvector GitHub](https://github.com/pgvector/pgvector) — IVFFlat index behavior, cosine distance operator
- [AWS — pgvector indexing deep dive](https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/) — IVFFlat vs HNSW, lists sizing

### Secondary (MEDIUM confidence)
- [npmjs.com — @modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — version 1.27.1 latest March 2026 (npm page returned 403; WebSearch result)
- [npmjs.com — openai](https://www.npmjs.com/package/openai) — version 6.27.0 latest March 2026 (WebSearch result)
- [GitHub — modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) — v2 pre-alpha on main; v1.x production recommendation
- [Weaviate — Chunking Strategies for RAG](https://weaviate.io/blog/chunking-strategies-for-rag) — heading-aware chunking recommendations
- [Stormatics — Understanding Indexes in pgvector](https://stormatics.tech/blogs/understanding-indexes-in-pgvector) — IVFFlat empty table behavior
- [Vercel Community — 504 timeout](https://community.vercel.com/t/next-js-api-routes-returns-504-gateway-timeout-while-working-locally/9222) — Hobby plan timeout behavior
- [julien.chable.net — Fix spawn npx ENOENT in VSCode](https://julien.chable.net/fixing-spawn-npx-enoent-error-when-setting-up-azure-devops-mcp-server-in-vs-code) — absolute path in mcp.json
- [BetterStack — tsx vs ts-node](https://betterstack.com/community/guides/scaling-nodejs/tsx-vs-ts-node/) — tsx preferred for ESM/Windows

### Tertiary (from linked GitHub issues — patterns confirmed, details may vary)
- [MCP servers issue #1107](https://github.com/modelcontextprotocol/servers/issues/1107) — Windows path resolution in MCP server config
- [TypeStrong/ts-node issue #2086](https://github.com/TypeStrong/ts-node/issues/2086) — ts-node ESM issues on Windows
- [pgvector issue #72](https://github.com/pgvector/pgvector/issues/72) — cosine distance vs similarity operator confusion

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
