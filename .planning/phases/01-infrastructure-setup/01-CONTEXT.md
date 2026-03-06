# Phase 1: Infrastructure Setup - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Provision all prerequisites for development: GitHub repo created, Vercel project linked, Neon Postgres with pgvector enabled, environment variables set in .env.local and Vercel, and CLAUDE.md + DESIGN.md present at project root. Nothing is built here — everything downstream depends on these being correct.

</domain>

<decisions>
## Implementation Decisions

### Neon Postgres Setup
- Use Vercel Marketplace integration (Storage tab in Vercel dashboard) — not a standalone Neon account
- `vercel env pull .env.local` to auto-populate DATABASE_URL and all Neon-injected env vars locally
- pgvector extension enabled via Neon console SQL editor: `CREATE EXTENSION IF NOT EXISTS vector;` — manual one-time step, not a migration script
- The Neon connection URL to use for pgvector queries is the non-pooling URL (avoids Pgbouncer transaction mode limitations with pgvector)

### CLAUDE.md + DESIGN.md Placement
- Copy both files from `docs/` to project root: `cp docs/CLAUDE.md . && cp docs/DESIGN.md .`
- Root copies are what agents and build tools read; docs/ copies remain as-is
- Append the project-specific section from the PRD to the root CLAUDE.md:
  ```
  ## PROJECT: crowe-ai-onboarding
  - RAG app: OpenAI text-embedding-3-small + gpt-4o
  - Knowledge base docs in /docs (01- through 08-) — edit, then npm run ingest
  - 00-PRD.md in /docs is excluded from ingestion
  - Vercel Postgres + pgvector — connection via @neondatabase/serverless
  - OpenAI only — never add Anthropic API dependencies
  - temperature: 0.2, topK: 5, similarity threshold: 0.3
  - INGEST_SECRET protects /api/ingest route
  ```

### GitHub Repo + Vercel Project
- Create GitHub repo `achyuthrachur/crowe-ai-onboarding` (public) in Phase 1 — Vercel requires a linked repo
- Use gh CLI at full path: `/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe`
- Vercel project under `achyuth-rachurs-projects` team (team_jTMSsUBJBbOqgNTyjjsr9PY2), not personal account
- Vercel project is created fresh — does not already exist
- Vercel link: `NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project crowe-ai-onboarding`

### Environment Variables
- OPENAI_API_KEY: User has the key — add directly to .env.local and Vercel dashboard (never paste in chat)
- INGEST_SECRET: User will provide a specific value — planner leaves `INGEST_SECRET=your-value-here` placeholder
- Add OPENAI_API_KEY and INGEST_SECRET to Vercel via dashboard (Settings → Environment Variables), not CLI
- DATABASE_URL (and POSTGRES_URL variants): pulled automatically via `vercel env pull`
- `NODE_TLS_REJECT_UNAUTHORIZED=0` is shell-only — never add to .env.local or Vercel env vars

### .env.example
- Create `.env.example` at project root with all required keys documented (no real values)
- Note which vars are auto-injected by Vercel Neon integration vs manually added

### Claude's Discretion
- Exact .env.example format and comments
- Gitignore configuration (.env.local already standard Next.js gitignore behavior)

</decisions>

<specifics>
## Specific Ideas

- The knowledge base docs (01-08) in `docs/` already contain real content — not stubs. Phase 2 (RAGG-07) can skip creating stub files since real content already exists.
- All Vercel CLI commands on Crowe network need `NODE_TLS_REJECT_UNAUTHORIZED=0` prefix — this is a shell-only workaround, not an env file setting.
- gh CLI is at non-standard path: `/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe` — use full path or set GH variable.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/CLAUDE.md`: Copy to project root + append project-specific section from PRD
- `docs/DESIGN.md`: Copy to project root (no modifications needed)
- `docs/01-08-*.md`: Real content already present — Phase 2 does not need to create stubs

### Established Patterns
- None yet — this is the first phase, greenfield

### Integration Points
- GitHub repo → Vercel project link is the dependency chain for all subsequent deployment steps
- Neon Postgres DATABASE_URL flows into `src/lib/db.ts` (Phase 2)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-infrastructure-setup*
*Context gathered: 2026-03-06*
