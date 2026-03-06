# Phase 2: RAG App Scaffold - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Initialize the Next.js 14 App Router project, apply the full Crowe brand foundation (Tailwind config + CSS variables + shadcn/ui init), create the `doc_chunks` database schema (table only — no IVFFlat index), and implement the three lib utilities: `db.ts`, `chunker.ts`, `embeddings.ts`. No API routes, no ingestion, no UI components yet. Phase ends when `npm run dev` loads a minimal placeholder page and the three lib utilities are importable without TypeScript errors.

</domain>

<decisions>
## Implementation Decisions

### Next.js Init Flags
- Use `src/` directory: yes — `--src-dir` flag in `create-next-app`
- Import alias: `@/*` mapping to `src/*`
- ESLint: yes — include with `create-next-app`
- App Router: yes (default in Next.js 14)
- Full command:
  ```bash
  NODE_TLS_REJECT_UNAUTHORIZED=0 npx create-next-app@latest . \
    --typescript --tailwind --eslint --app --src-dir \
    --import-alias "@/*" --yes
  ```
- Note: Run in the existing project root (not a subdirectory) — `.` as the path

### Brand Foundation
- Apply **full brand foundation** in Phase 2 — not deferred
- Scope:
  1. `tailwind.config.ts` — Crowe color tokens (`crowe.amber`, `crowe.indigo`, `tint.*`), custom shadows (`crowe-sm`, `crowe-card`, `amber-glow`), background colors, font families, border radius tokens
  2. `src/app/globals.css` — shadcn CSS variable overrides (HSL values from CLAUDE.md Section 4.2) + Crowe semantic tokens as CSS vars
  3. `shadcn/ui` init only — applies theme to `globals.css` via `npx shadcn@latest init`, no individual components installed
- Source of truth: DESIGN.md and CLAUDE.md Section 4.2 (both at project root)
- `page.tsx`: Minimal placeholder only — a `<div>` with "Crowe AI Assistant" text in Crowe Indigo background (`bg-crowe-indigo-dark text-white`). Enough to verify brand tokens work. Real UI in Phase 5.

### Database Schema
- Create `doc_chunks` table only — NO IVFFlat index (index created in Phase 3 after ingestion)
- Schema:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE TABLE IF NOT EXISTS doc_chunks (
    id          SERIAL PRIMARY KEY,
    doc_id      TEXT NOT NULL,
    doc_title   TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(1536),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- Run via `@neondatabase/serverless` in a migration script or directly in db.ts setup

### lib/db.ts
- Use `@neondatabase/serverless` (not `@vercel/postgres` — deprecated)
- Connect via `POSTGRES_URL_NON_POOLING` (not the pooled URL — pgvector requires session-level connection)
- Export a `sql` tagged template function for use in other modules

### lib/chunker.ts
- Token counting: character-based estimate (4 chars ≈ 1 token) — no tiktoken dependency
- Parameters as named constants at top of file:
  ```typescript
  const MAX_CHUNK_CHARS = 2400  // ~600 tokens
  const MIN_CHUNK_CHARS = 400   // ~100 tokens
  const OVERLAP_CHARS = 200     // ~50 tokens
  ```
- Split strategy: heading boundaries first (`## ` and `### `), then paragraph breaks (`\n\n`) if section exceeds MAX_CHUNK_CHARS
- Chunk content format: heading prefix + body — `"## Section Title\n\n[body text]"`
- Merge strategy: sections under MIN_CHUNK_CHARS merged with next sibling
- Each chunk returns: `{ docId, docTitle, chunkIndex, content }`

### lib/embeddings.ts
- Use OpenAI SDK (`openai` package, already specified in PRD)
- Model: `text-embedding-3-small` (1536 dimensions)
- Export a single `embedText(text: string): Promise<number[]>` function
- Use `OPENAI_API_KEY` from env — no hardcoded keys

### docs/ folder
- **RAGG-07 is pre-satisfied** — `docs/01-` through `docs/08-` already have real content (not stubs)
- No action needed — planner should skip creating stub files and simply note this in the plan
- `docs/00-PRD.md` exists and stays excluded from ingestion (as per PRD)

### Claude's Discretion
- Exact TypeScript strictness settings in `tsconfig.json` (use Next.js 14 defaults)
- Font loading strategy for Helvetica Now (use fallback stack since fonts aren't licensed — `Arial, 'Helvetica Neue', system-ui, sans-serif`)
- Exact `next.config.ts` contents (use Next.js 14 defaults)
- Whether to create a `src/lib/prompt.ts` now or in Phase 4 (defer to Phase 4)

</decisions>

<specifics>
## Specific Ideas

- The `create-next-app` command runs in the existing repo root (`.`) — there are already files there (CLAUDE.md, DESIGN.md, docs/, .planning/). The `--yes` flag should skip conflicts but the planner should note this behavior.
- Tailwind config color tokens are fully specified in CLAUDE.md Section 2.2 — copy the exact values, don't paraphrase.
- shadcn init may need `NODE_TLS_REJECT_UNAUTHORIZED=0` prefix on Crowe network (registry calls are HTTPS).
- `POSTGRES_URL_NON_POOLING` is the env var to use for db.ts — NOT `DATABASE_URL` (which is pooled via Pgbouncer and incompatible with pgvector session-level queries).

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CLAUDE.md` (root): Full Tailwind config, shadcn theme overrides, font families, shadow tokens — Section 2.2, 4.2. Copy values directly, don't re-derive.
- `DESIGN.md` (root): Color system, surface treatments, shadow values, anti-patterns. Reference for globals.css.
- `docs/01-08-*.md`: Real knowledge base content already present — no stub creation needed.
- `.env.local`: `POSTGRES_URL_NON_POOLING` and `OPENAI_API_KEY` already set.

### Established Patterns
- None yet (no app code exists) — this phase establishes the patterns

### Integration Points
- `src/lib/db.ts` → consumed by `scripts/ingest.ts` (Phase 3) and `src/app/api/chat/route.ts` (Phase 4)
- `src/lib/chunker.ts` → consumed by `scripts/ingest.ts` (Phase 3)
- `src/lib/embeddings.ts` → consumed by `scripts/ingest.ts` (Phase 3) and `src/app/api/chat/route.ts` (Phase 4)
- `doc_chunks` table → written by Phase 3 ingest, read by Phase 4 chat API

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-rag-app-scaffold*
*Context gathered: 2026-03-06*
