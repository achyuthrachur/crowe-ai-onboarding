# Requirements: Crowe AI Onboarding System

**Defined:** 2026-03-06
**Core Value:** New hires can immediately access Crowe AI practice knowledge — stack decisions, branding standards, workflows, and project patterns — without digging through documents or asking someone.

---

## v1 Requirements

### Infrastructure

- [x] **INFRA-01**: Vercel project created and linked to GitHub repo `achyuthrachur/crowe-ai-onboarding`
- [ ] **INFRA-02**: Neon Postgres database provisioned and connected to Vercel project (via Vercel Marketplace integration)
- [ ] **INFRA-03**: pgvector extension enabled on Neon database
- [x] **INFRA-04**: All required environment variables present in `.env.local` and Vercel production (OPENAI_API_KEY, DATABASE_URL, INGEST_SECRET)
- [x] **INFRA-05**: CLAUDE.md and DESIGN.md present at `crowe-ai-onboarding` project root before any code is written
- [ ] **INFRA-06**: CLAUDE.md and DESIGN.md present at `crowe-mcp-server` project root before any code is written

### RAG App Scaffold

- [x] **RAGG-01**: Next.js 14 App Router project initialized with TypeScript, Tailwind CSS, shadcn/ui
- [x] **RAGG-02**: Crowe brand tokens in `globals.css` and `tailwind.config.ts` matching DESIGN.md (Indigo Dark, Amber, warm neutrals, indigo-tinted shadows)
- [x] **RAGG-03**: `doc_chunks` table created in Neon Postgres (id, doc_id, doc_title, chunk_index, content, embedding vector(1536), created_at) — no index at this stage
- [x] **RAGG-04**: `src/lib/db.ts` — Neon serverless Postgres client (using `@neondatabase/serverless`)
- [x] **RAGG-05**: `src/lib/chunker.ts` — heading-aware markdown chunker (split on ##/### boundaries, 300-600 token target, 50-token overlap, heading prefix on each chunk, merge sections under 100 tokens)
- [x] **RAGG-06**: `src/lib/embeddings.ts` — OpenAI embeddings wrapper using `text-embedding-3-small` (1536 dimensions)
- [x] **RAGG-07**: `docs/` folder with 8 stub markdown files (`01-` through `08-`) — real content dropped in manually

### Ingestion Pipeline

- [x] **INGS-01**: `scripts/ingest.ts` CLI script — reads all .md files from `/docs` (skips `00-PRD.md`), chunks, batch-embeds, upserts to pgvector
- [x] **INGS-02**: Embedding calls are batched (single `openai.embeddings.create({ input: [...] })` for all chunks of a doc) — not called per-chunk
- [x] **INGS-03**: Ingestion is idempotent — deletes existing rows for a `docId` before re-inserting
- [x] **INGS-04**: IVFFlat index (`vector_cosine_ops`, `lists=100`) created after all rows are inserted — not in schema migration
- [x] **INGS-05**: `npm run ingest` command defined in `package.json`
- [x] **INGS-06**: `src/app/api/ingest/route.ts` — POST endpoint protected by `x-ingest-secret` header; fail-closed (rejects if env var missing or header mismatch)
- [x] **INGS-07**: Successful `npm run ingest` populates database with non-null embeddings (verifiable in Neon console)

### Chat API

- [ ] **CHAT-01**: `src/app/api/chat/route.ts` — POST `/api/chat` accepts `{ message, history }`, returns `{ reply, sources }`
- [ ] **CHAT-02**: Query embedding generated via `text-embedding-3-small` on incoming message
- [ ] **CHAT-03**: Cosine similarity search using correct operator: `1 - (embedding <=> $1::vector) > 0.3` (distance, not similarity — documented in code comment)
- [ ] **CHAT-04**: Top-5 chunks retrieved (`topK=5`), filtered to similarity >= 0.3
- [ ] **CHAT-05**: When no chunks meet 0.3 threshold, returns explicit fallback: "I don't have information on that in the knowledge base."
- [ ] **CHAT-06**: Source citations returned as `{ docId, docTitle, similarity }[]` with every reply
- [ ] **CHAT-07**: gpt-4o completion with system prompt from PRD (`temperature: 0.2`, `max_tokens: 800`, `stream: false`)
- [ ] **CHAT-08**: Manual test passes: "what colors does Crowe use?" returns answer with source citation from branding doc

### Chat UI

- [ ] **UI-01**: Full-page chat layout — indigo dark `#011E41` top bar (h-14), scrollable messages area, input bar (h-20)
- [ ] **UI-02**: User message bubbles — right-aligned, amber-tinted pill (`bg-crowe-amber/10 border-crowe-amber/20`)
- [ ] **UI-03**: Assistant message bubbles — left-aligned white card, soft indigo-tinted shadow, markdown-rendered
- [ ] **UI-04**: Markdown rendering via `react-markdown` + `remark-gfm`; code blocks with copy button
- [ ] **UI-05**: Source citation chips below assistant messages — `[doc-title]` format, expand on hover/click to show full title
- [ ] **UI-06**: 4 starter prompt chips on empty state: "How do I start a new Next.js project?", "What UI library should I use for animations?", "What are the Crowe brand colors?", "How do I deploy to Vercel?"
- [ ] **UI-07**: Loading skeleton during API call
- [ ] **UI-08**: Error state displayed when API call fails
- [ ] **UI-09**: Send button `bg-crowe-amber` with amber glow on hover; input focus ring `ring-crowe-amber`
- [ ] **UI-10**: Page background `#f8f9fc` — never pure white; all shadows use `rgba(1,30,65,X)` — never `rgba(0,0,0,X)`
- [ ] **UI-11**: Responsive layout from 375px mobile through desktop
- [ ] **UI-12**: `npm run build` passes with zero TypeScript errors

### RAG App Deployment

- [ ] **RDEP-01**: GitHub repo `achyuthrachur/crowe-ai-onboarding` created and code pushed
- [ ] **RDEP-02**: Vercel production deployment resolves at `crowe-ai-onboarding.vercel.app`
- [ ] **RDEP-03**: `npm run ingest` run against production Neon DB (rows with non-null embeddings present)
- [ ] **RDEP-04**: 3 test questions all return grounded answers with source citations in production
- [ ] **RDEP-05**: Unauthenticated POST to `/api/ingest` returns 401 or 500 (INGEST_SECRET enforced)
- [ ] **RDEP-06**: Lighthouse performance score >= 90
- [ ] **RDEP-07**: Mobile layout verified at 375px width

### MCP Server Scaffold

- [ ] **MCPS-01**: `crowe-mcp-server` Node.js/TypeScript project initialized with `@modelcontextprotocol/sdk ^1.27.1`, `zod ^3.x`, `tsx ^4.x`
- [ ] **MCPS-02**: CommonJS tsconfig (`"module": "CommonJS"`) — not ESM — to avoid Windows resolution issues
- [ ] **MCPS-03**: `src/index.ts` — MCP server with StdioServerTransport; only `console.error()` used (never `console.log()`)
- [ ] **MCPS-04**: `src/assets.ts` — dual-mode path resolver (bundled `assets/` default; `ASSETS_PATH` env override for live mode)
- [ ] **MCPS-05**: `assets/` folder committed with CLAUDE.md, DESIGN.md, and all 8 docs (copies from crowe-ai-onboarding)
- [ ] **MCPS-06**: `assets/project-registry.json` with all 7 projects (name, description, stack, repo, url)

### MCP Server Tools

- [ ] **MCPT-01**: `get_branding_standards` — returns full DESIGN.md content; description references Crowe color tokens accurately
- [ ] **MCPT-02**: `get_project_conventions` — returns full CLAUDE.md content; TypeScript style, React patterns, git workflow
- [ ] **MCPT-03**: `get_stack_reference` — returns stack-overview.md; default stack, library decision tree
- [ ] **MCPT-04**: `get_deployment_guide` — returns vercel-deployment.md; Vercel setup, SSL workarounds, gh CLI
- [ ] **MCPT-05**: `get_ui_library_guide` — returns ui-libraries.md; shadcn vs React Bits vs 21st.dev vs Anime.js
- [ ] **MCPT-06**: `get_workflow_guide` — returns workflow-guide.md; GSD framework, Copilot tips, task patterns
- [ ] **MCPT-07**: `get_resource_links` — returns resources.md; all canonical URLs
- [ ] **MCPT-08**: `list_projects` — returns formatted project list from project-registry.json
- [ ] **MCPT-09**: `get_project_readme` — returns README for a named project (bundled or live from disk)
- [ ] **MCPT-10**: `search_docs` — keyword search across all assets, returns top-5 matching sections with file and score
- [ ] **MCPT-11**: All 10 tools have Zod-validated inputs and graceful error handling (errors returned as data, no unhandled throws)
- [ ] **MCPT-12**: All tool descriptions are precise and imperative (Copilot uses descriptions for routing — vague = never called)

### MCP Server Windows Integration

- [ ] **MCPW-01**: `.vscode/mcp.json` pre-configured with absolute `node.exe` path (not `node` which fails when VSCode PATH doesn't include user-scope install)
- [ ] **MCPW-02**: `scripts/generate-mcp-config.js` — detects absolute Node path and writes `.vscode/mcp.json` automatically
- [ ] **MCPW-03**: `npm run build && node dist/index.js` runs cleanly on Windows (Git Bash + PowerShell) without errors
- [ ] **MCPW-04**: VSCode integration test: ask Copilot "what background color should I use?" → Copilot calls `get_branding_standards` → returns `#f8f9fc`
- [ ] **MCPW-05**: `README.md` — `NODE_TLS_REJECT_UNAUTHORIZED=0` documented as Step 1; full 5-minute Windows setup guide
- [ ] **MCPW-06**: `.env.example` documents `ASSETS_PATH` with explanation of live mode

---

## v2 Requirements

### RAG App

- **RAGG-V2-01**: Real-time streaming responses (SSE) — adds complexity, marginal UX gain for sub-3s responses
- **RAGG-V2-02**: User feedback (thumbs up/down) — only useful with a feedback pipeline to act on
- **RAGG-V2-03**: Admin UI for knowledge base editing — git is the right editor for markdown files
- **RAGG-V2-04**: Server-side conversation history — client state is sufficient for onboarding use case

### MCP Server

- **MCPS-V2-01**: HTTP/SSE transport mode — requires auth and firewall rules; stdio is correct for local dev tools
- **MCPS-V2-02**: Semantic search via RAG API — adds network dependency; keyword search is sufficient
- **MCPS-V2-03**: Auto-sync assets from RAG app — git pull is the right update mechanism

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Authentication / login | No multi-user isolation needed; public Vercel URL is fine |
| Multi-user isolation | Single-tenant internal tool for small team |
| Mobile app | Web-first (RAG app) and VSCode-first (MCP server) |
| Automated ingestion on doc change | Manual `npm run ingest` is sufficient; avoid infra complexity |
| Fine-tuning | RAG allows instant knowledge base updates without retraining |
| Crowe SSO / Active Directory | Not accessible without corporate domain |
| Any Anthropic/Claude API usage | OpenAI only throughout — never add Anthropic dependencies |
| LangChain / Vercel AI SDK / Prisma | Adds abstraction over direct OpenAI SDK; excluded by PRD |
| Streaming responses (v1) | Adds SSE/WebSocket complexity; 3-second static response is acceptable |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 7 | Pending |
| RAGG-01 | Phase 2 | Complete |
| RAGG-02 | Phase 2 | Complete |
| RAGG-03 | Phase 2 | Complete |
| RAGG-04 | Phase 2 | Complete |
| RAGG-05 | Phase 2 | Complete |
| RAGG-06 | Phase 2 | Complete |
| RAGG-07 | Phase 2 | Complete |
| INGS-01 | Phase 3 | Complete |
| INGS-02 | Phase 3 | Complete |
| INGS-03 | Phase 3 | Complete |
| INGS-04 | Phase 3 | Complete |
| INGS-05 | Phase 3 | Complete |
| INGS-06 | Phase 3 | Complete |
| INGS-07 | Phase 3 | Complete |
| CHAT-01 | Phase 4 | Pending |
| CHAT-02 | Phase 4 | Pending |
| CHAT-03 | Phase 4 | Pending |
| CHAT-04 | Phase 4 | Pending |
| CHAT-05 | Phase 4 | Pending |
| CHAT-06 | Phase 4 | Pending |
| CHAT-07 | Phase 4 | Pending |
| CHAT-08 | Phase 4 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |
| UI-05 | Phase 5 | Pending |
| UI-06 | Phase 5 | Pending |
| UI-07 | Phase 5 | Pending |
| UI-08 | Phase 5 | Pending |
| UI-09 | Phase 5 | Pending |
| UI-10 | Phase 5 | Pending |
| UI-11 | Phase 5 | Pending |
| UI-12 | Phase 5 | Pending |
| RDEP-01 | Phase 6 | Pending |
| RDEP-02 | Phase 6 | Pending |
| RDEP-03 | Phase 6 | Pending |
| RDEP-04 | Phase 6 | Pending |
| RDEP-05 | Phase 6 | Pending |
| RDEP-06 | Phase 6 | Pending |
| RDEP-07 | Phase 6 | Pending |
| MCPS-01 | Phase 7 | Pending |
| MCPS-02 | Phase 7 | Pending |
| MCPS-03 | Phase 7 | Pending |
| MCPS-04 | Phase 7 | Pending |
| MCPS-05 | Phase 7 | Pending |
| MCPS-06 | Phase 7 | Pending |
| MCPT-01 | Phase 8 | Pending |
| MCPT-02 | Phase 8 | Pending |
| MCPT-03 | Phase 8 | Pending |
| MCPT-04 | Phase 8 | Pending |
| MCPT-05 | Phase 8 | Pending |
| MCPT-06 | Phase 8 | Pending |
| MCPT-07 | Phase 8 | Pending |
| MCPT-08 | Phase 8 | Pending |
| MCPT-09 | Phase 8 | Pending |
| MCPT-10 | Phase 8 | Pending |
| MCPT-11 | Phase 8 | Pending |
| MCPT-12 | Phase 8 | Pending |
| MCPW-01 | Phase 9 | Pending |
| MCPW-02 | Phase 9 | Pending |
| MCPW-03 | Phase 9 | Pending |
| MCPW-04 | Phase 9 | Pending |
| MCPW-05 | Phase 9 | Pending |
| MCPW-06 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 61 total
- Mapped to phases: 61
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after initial definition*
