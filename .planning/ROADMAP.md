# Roadmap: Crowe AI Onboarding System

## Overview

Build two complementary systems that give new Crowe AI practice hires instant access to practice knowledge. The RAG chat app (phases 1-6) is the critical path: infrastructure first, then ingestion, retrieval, UI, and deployment. The MCP server (phases 7-9) shares the same source documents but has no runtime coupling to the RAG app and begins after the RAG app is deployed and validated.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure Setup** - Provision Vercel, Neon Postgres with pgvector, and set environment variables (completed 2026-03-06)
- [x] **Phase 2: RAG App Scaffold** - Initialize Next.js 14 project, apply Crowe brand tokens, create DB schema, and build lib utilities (completed 2026-03-07)
- [ ] **Phase 3: Ingestion Pipeline** - Chunk docs, batch-embed, upsert to pgvector, build IVFFlat index post-ingestion
- [ ] **Phase 4: Chat API** - Build retrieval logic, cosine similarity search, fallback handling, and gpt-4o completion
- [ ] **Phase 5: Chat UI** - Full Crowe-branded chat interface with markdown, source chips, and starter prompts
- [ ] **Phase 6: RAG App Deployment** - Deploy to Vercel, run production ingest, validate live behavior and Lighthouse score
- [ ] **Phase 7: MCP Server Scaffold** - Initialize crowe-mcp-server TypeScript project with CommonJS config and bundled assets
- [ ] **Phase 8: MCP Server Tools** - Implement all 10 tools with Zod validation, graceful error handling, and precise descriptions
- [ ] **Phase 9: MCP Windows Integration** - Configure absolute Node paths, generate mcp.json, verify Windows execution, write README

## Phase Details

### Phase 1: Infrastructure Setup
**Goal**: All prerequisites for development exist — database provisioned, extensions enabled, secrets in place, brand and dev rules at project root
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Vercel project is linked to GitHub repo and Neon Postgres appears in the Vercel project integrations dashboard
  2. Connecting to the Neon database and running `SELECT * FROM pg_extension WHERE extname = 'vector'` returns one row
  3. Running `echo $OPENAI_API_KEY` in the project shell returns the key without error; INGEST_SECRET and DATABASE_URL are also present
  4. CLAUDE.md and DESIGN.md exist at the `crowe-ai-onboarding` project root and contain Crowe brand and development conventions
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Git init, GitHub repo create, Vercel link (INFRA-01)
- [ ] 01-02-PLAN.md — Neon Marketplace provisioning, pgvector enable, env pull (INFRA-02, INFRA-03)
- [ ] 01-03-PLAN.md — Env vars setup, .env.example, CLAUDE.md + DESIGN.md at root (INFRA-04, INFRA-05)

### Phase 2: RAG App Scaffold
**Goal**: A runnable Next.js 14 application exists with Crowe brand applied, the doc_chunks table created, and all lib utilities ready for use
**Depends on**: Phase 1
**Requirements**: RAGG-01, RAGG-02, RAGG-03, RAGG-04, RAGG-05, RAGG-06, RAGG-07
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts without errors and the app loads at localhost:3000
  2. The page background is `#f8f9fc`, the top bar is `#011E41`, and CTA elements use amber `#F5A800` — matching DESIGN.md exactly
  3. Running `\d doc_chunks` in psql against the Neon database shows the correct schema (id, doc_id, doc_title, chunk_index, content, embedding vector(1536), created_at) — no index yet
  4. Importing `db.ts`, `chunker.ts`, and `embeddings.ts` in a test script runs without TypeScript errors
  5. The `docs/` folder contains 8 stub markdown files named `01-` through `08-`
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Next.js scaffold, install @neondatabase/serverless + openai, shadcn init (RAGG-01)
- [ ] 02-02-PLAN.md — Crowe brand tokens in tailwind.config.ts + globals.css, page.tsx placeholder (RAGG-02)
- [ ] 02-03-PLAN.md — db.ts, chunker.ts, embeddings.ts, migration script + run, docs/ confirmed (RAGG-03, RAGG-04, RAGG-05, RAGG-06, RAGG-07)

### Phase 3: Ingestion Pipeline
**Goal**: All 8 docs are chunked, embedded, and stored in pgvector with an IVFFlat index built after the data is loaded
**Depends on**: Phase 2
**Requirements**: INGS-01, INGS-02, INGS-03, INGS-04, INGS-05, INGS-06, INGS-07
**Success Criteria** (what must be TRUE):
  1. `npm run ingest` completes without error and the Neon console shows rows with non-null embeddings in the doc_chunks table
  2. Re-running `npm run ingest` for the same doc deletes existing rows before inserting — row count stays stable, not doubling
  3. `SELECT indexname FROM pg_indexes WHERE tablename = 'doc_chunks'` returns the IVFFlat index after ingestion completes
  4. A POST to `/api/ingest` without the `x-ingest-secret` header returns 401 or 500 (fail-closed enforcement)
  5. All embeddings in doc_chunks have dimension 1536 (verifiable via `SELECT vector_dims(embedding) FROM doc_chunks LIMIT 1`)
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — src/lib/ingest.ts shared module (ingestDoc + ingestAll + IVFFlat) (INGS-01, INGS-02, INGS-03, INGS-04, INGS-07)
- [ ] 03-02-PLAN.md — scripts/ingest.ts CLI entry point + package.json ingest script (INGS-01, INGS-05, INGS-07)
- [ ] 03-03-PLAN.md — src/app/api/ingest/route.ts HTTP endpoint with fail-closed auth (INGS-06)

### Phase 4: Chat API
**Goal**: A working chat endpoint returns grounded answers with source citations for on-topic queries and an explicit fallback for off-topic queries
**Depends on**: Phase 3
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08
**Success Criteria** (what must be TRUE):
  1. A POST to `/api/chat` with `{ "message": "what colors does Crowe use?" }` returns `{ reply: "...", sources: [...] }` with at least one source from the branding doc
  2. A POST with a clearly off-topic message (e.g., "what is the capital of France?") returns the exact fallback text: "I don't have information on that in the knowledge base."
  3. The `sources` array in every reply contains objects with `docId`, `docTitle`, and `similarity` fields
  4. Manual inspection of the route code confirms the cosine similarity operator is `1 - (embedding <=> $1::vector) > 0.3` with a code comment explaining the distance-vs-similarity distinction
**Plans**: TBD

### Phase 5: Chat UI
**Goal**: A new hire visiting the app can ask a question and receive a formatted, branded answer with source citations — on any screen size from 375px up
**Depends on**: Phase 4
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12
**Success Criteria** (what must be TRUE):
  1. Sending a question shows a loading skeleton during the API call, then renders the reply with markdown (headers, lists, inline code) correctly formatted
  2. Code blocks in assistant replies have a copy button that copies the code to clipboard
  3. Source citation chips appear below each assistant reply; hovering or clicking a chip expands to show the full document title
  4. The empty state shows 4 starter prompt chips; clicking one populates the input and sends the message
  5. The layout is usable at 375px mobile width with no horizontal overflow; `npm run build` passes with zero TypeScript errors
**Plans**: TBD

### Phase 6: RAG App Deployment
**Goal**: The RAG chat app is live at crowe-ai-onboarding.vercel.app, knowledge base is ingested into production, and the app passes quality gates
**Depends on**: Phase 5
**Requirements**: RDEP-01, RDEP-02, RDEP-03, RDEP-04, RDEP-05, RDEP-06, RDEP-07
**Success Criteria** (what must be TRUE):
  1. Navigating to `https://crowe-ai-onboarding.vercel.app` loads the chat UI without error
  2. Asking 3 test questions in production returns grounded answers with source citations — not fallback responses
  3. A Lighthouse performance audit on the production URL returns a score >= 90
  4. An unauthenticated POST to `https://crowe-ai-onboarding.vercel.app/api/ingest` returns 401 or 500
  5. The mobile layout at 375px width is correct in production (no overflow, usable input, readable messages)
**Plans**: TBD

### Phase 7: MCP Server Scaffold
**Goal**: A runnable MCP server TypeScript project exists in `crowe-mcp-server` with CommonJS output, StdioServerTransport connected, and all bundled assets committed
**Depends on**: Phase 6
**Requirements**: MCPS-01, MCPS-02, MCPS-03, MCPS-04, MCPS-05, MCPS-06, INFRA-06
**Success Criteria** (what must be TRUE):
  1. `npm run build` in `crowe-mcp-server` produces `dist/index.js` without errors; `node dist/index.js` starts the server without crashing
  2. The `assets/` folder is committed and contains CLAUDE.md, DESIGN.md, all 8 docs, and `project-registry.json` with 7 projects
  3. CLAUDE.md and DESIGN.md exist at the `crowe-mcp-server` project root
  4. The tsconfig `"module"` field is `"CommonJS"` — verified by reading `tsconfig.json`
**Plans**: TBD

### Phase 8: MCP Server Tools
**Goal**: All 10 MCP tools are implemented, Zod-validated, and return useful responses — Copilot can call any tool and receive accurate practice knowledge
**Depends on**: Phase 7
**Requirements**: MCPT-01, MCPT-02, MCPT-03, MCPT-04, MCPT-05, MCPT-06, MCPT-07, MCPT-08, MCPT-09, MCPT-10, MCPT-11, MCPT-12
**Success Criteria** (what must be TRUE):
  1. All 10 tools are registered and respond without crashing when called with valid inputs via the MCP inspector or test script
  2. `search_docs` called with "background color" returns at least one result referencing `#f8f9fc` from the branding doc
  3. `get_project_readme` called with a valid project name returns the full README content for that project
  4. Calling any tool with an invalid or missing required input returns a structured error response — no unhandled throws that crash the server
**Plans**: TBD

### Phase 9: MCP Windows Integration
**Goal**: A new Crowe hire on Windows can clone `crowe-mcp-server`, follow the README, and have Copilot calling MCP tools within 5 minutes
**Depends on**: Phase 8
**Requirements**: MCPW-01, MCPW-02, MCPW-03, MCPW-04, MCPW-05, MCPW-06
**Success Criteria** (what must be TRUE):
  1. `npm run build && node dist/index.js` runs without error in both Git Bash and PowerShell on Windows
  2. Asking GitHub Copilot "what background color should I use?" triggers a call to `get_branding_standards` and returns `#f8f9fc`
  3. The README documents `NODE_TLS_REJECT_UNAUTHORIZED=0` as Step 1 and the full setup takes under 5 minutes when followed from scratch
  4. Running `node scripts/generate-mcp-config.js` writes `.vscode/mcp.json` with an absolute path to the local `node.exe`
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Setup | 3/3 | Complete    | 2026-03-06 |
| 2. RAG App Scaffold | 3/3 | Complete    | 2026-03-07 |
| 3. Ingestion Pipeline | 0/3 | Not started | - |
| 4. Chat API | 0/TBD | Not started | - |
| 5. Chat UI | 0/TBD | Not started | - |
| 6. RAG App Deployment | 0/TBD | Not started | - |
| 7. MCP Server Scaffold | 0/TBD | Not started | - |
| 8. MCP Server Tools | 0/TBD | Not started | - |
| 9. MCP Windows Integration | 0/TBD | Not started | - |
