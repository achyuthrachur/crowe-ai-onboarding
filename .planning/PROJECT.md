# Crowe AI Onboarding System

## What This Is

A two-repo system that helps new Crowe AI practice hires get up to speed quickly. The first repo (`crowe-ai-onboarding`) is a browser-based RAG chat app where new hires ask questions and get answers grounded in Crowe AI practice docs. The second repo (`crowe-mcp-server`) is a local MCP server that plugs into VSCode + GitHub Copilot, exposing Crowe practice assets as callable tools during active development sessions.

## Core Value

New hires can immediately access Crowe AI practice knowledge — stack decisions, branding standards, workflows, and project patterns — without digging through documents or asking someone.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**RAG App (crowe-ai-onboarding):**
- [ ] Next.js app with Vercel Postgres (pgvector) stores embedded knowledge base from 8 markdown docs
- [ ] Ingestion pipeline chunks markdown docs, generates embeddings via OpenAI, stores in pgvector
- [ ] Chat API retrieves top-5 relevant chunks via cosine similarity, generates answer via gpt-4o with source citations
- [ ] Chat UI with Crowe branding — message history, source chips, 4 starter prompts, markdown rendering, code copy buttons
- [ ] Deployed to Vercel at crowe-ai-onboarding.vercel.app with production ingestion completed
- [ ] Passes Lighthouse >= 90, responsive from 375px

**MCP Server (crowe-mcp-server):**
- [ ] Local Node.js/TypeScript MCP server with stdio transport, 10 tools covering all Crowe practice assets
- [ ] Bundled assets mode (clone and go) with optional live mode via ASSETS_PATH env var
- [ ] Keyword search across all docs (search_docs tool)
- [ ] Project registry with 7 projects (list_projects, get_project_readme tools)
- [ ] Pre-configured .vscode/mcp.json for VSCode + Copilot integration
- [ ] Works cleanly on Windows (Git Bash + PowerShell)
- [ ] New hire README with 5-minute setup guide

### Out of Scope

- Authentication / login — no multi-user isolation needed, public access is fine
- Real-time streaming — static request/response is sufficient
- Server-side conversation history — client-side state only
- Mobile app — web-first, VSCode-first
- Automated ingestion on doc change — manual npm run ingest is fine
- Fine-tuning — RAG is sufficient
- Crowe SSO / Active Directory — not accessible without corporate domain
- Any Anthropic/Claude API usage — OpenAI only throughout

## Context

- **Two repos:** `crowe-ai-onboarding` (this repo, Vercel) + `crowe-mcp-server` (separate repo, local only)
- **AI runtime:** OpenAI only — `gpt-4o` for completions, `text-embedding-3-small` for embeddings (1536 dimensions)
- **Target users:** New Crowe AI practice hires using browser + VSCode + GitHub Copilot
- **Network constraint:** Crowe corporate SSL proxy requires `NODE_TLS_REJECT_UNAUTHORIZED=0` for all npm/vercel/git commands
- **No admin rights:** All installs must be user-scope on Windows machines
- **Knowledge base:** 8 markdown docs (01-08), PRD (00) excluded from ingestion
- **Brand reference:** CLAUDE.md and DESIGN.md must be present at both project roots before any code is written
- **Vector similarity threshold:** 0.3 minimum — below this returns "I don't have information on that"
- **Ingestion secret:** INGEST_SECRET header protects /api/ingest route

## Constraints

- **Tech stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui — no deviations
- **OpenAI only:** No Anthropic API. OPENAI_API_KEY throughout. Never add Anthropic dependencies.
- **Database:** Vercel Postgres with pgvector extension. Schema: doc_chunks table with ivfflat index (lists=100)
- **MCP transport:** StdioServerTransport only — local execution, not HTTP
- **Windows target:** MCP server must work in Git Bash and PowerShell on Windows
- **Crowe brand:** All UI must follow DESIGN.md — Indigo Dark #011E41 top bar, Amber #F5A800 CTAs, #f8f9fc page background, indigo-tinted shadows (never pure black)
- **Vercel deployment:** Using Crowe network — all vercel CLI commands need NODE_TLS_REJECT_UNAUTHORIZED=0
- **gh CLI path:** C:\Users\RachurA\AppData\Local\gh-cli\bin\gh.exe (not in PATH)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| OpenAI only (no Anthropic) | Crowe toolchain uses ChatGPT + Copilot; consistency for new hires | — Pending |
| RAG over fine-tuning | Knowledge base will be updated; RAG allows instant updates via ingest | — Pending |
| pgvector on Vercel Postgres | No additional infra; Vercel-native; co-located with app | — Pending |
| Bundled assets in MCP repo | New hire clones and goes immediately; no dependency on live file paths | — Pending |
| MCP stdio transport | Copilot integration requirement; local-only is intentional | — Pending |
| Both repos planned in one roadmap | Sequential dependency: RAG app then MCP server | — Pending |

---
*Last updated: 2026-03-06 after initialization*
