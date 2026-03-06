---
phase: 01-infrastructure-setup
plan: 03
subsystem: infra
tags: [env, openai, secrets, claude, design-system]

# Dependency graph
requires:
  - phase: 01-02
    provides: Neon Postgres env vars pulled into .env.local (DATABASE_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING)

provides:
  - .env.local with OPENAI_API_KEY and INGEST_SECRET placeholder entries
  - .env.example committed to git with all 5 vars documented (no real values)
  - CLAUDE.md at project root with ## PROJECT: crowe-ai-onboarding section
  - DESIGN.md at project root (Crowe brand tokens and design conventions)

affects:
  - 02-schema-migration
  - 03-ingestion-pipeline
  - 04-chat-api
  - all downstream phases (read CLAUDE.md for project conventions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Env vars split into auto-injected (Neon) vs manually-added (OpenAI, INGEST_SECRET)
    - .env.example as developer onboarding guide committed to git, .env.local never committed
    - Root CLAUDE.md = docs/CLAUDE.md + project-specific section appended

key-files:
  created:
    - .env.example
    - CLAUDE.md (project root)
    - DESIGN.md (project root)
  modified:
    - .env.local (appended OPENAI_API_KEY and INGEST_SECRET placeholders)

key-decisions:
  - "OPENAI_API_KEY and INGEST_SECRET added as placeholders in .env.local — user must replace with real values and add to Vercel dashboard"
  - "NODE_TLS_REJECT_UNAUTHORIZED=0 appears only in comments in .env.example — never as an assignment line, never in Vercel env vars"
  - "Root CLAUDE.md is the authoritative source for AI agents; docs/CLAUDE.md is the base copy, root has the project-specific section appended"

patterns-established:
  - "Pattern: .env.local never committed; .env.example always committed as developer template"
  - "Pattern: CLAUDE.md at project root = universal conventions + project-specific section; agents read root copy"

requirements-completed: [INFRA-04, INFRA-05]

# Metrics
duration: 8min
completed: 2026-03-06
---

# Phase 1 Plan 3: Env Vars and Project Root Files Summary

**.env.local completed with all 5 required vars, .env.example committed as developer template, root CLAUDE.md with project-specific RAG/OpenAI section, and DESIGN.md with Crowe brand tokens**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-06T~20:35:00Z
- **Completed:** 2026-03-06T~20:43:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Appended OPENAI_API_KEY and INGEST_SECRET placeholder entries to .env.local (Neon vars preserved)
- Created and committed .env.example documenting all 5 required env vars with explanatory comments
- Copied docs/CLAUDE.md to project root and appended ## PROJECT: crowe-ai-onboarding section with RAG config (model, topK, threshold, INGEST_SECRET protection)
- Copied docs/DESIGN.md to project root (Crowe brand tokens, typography, color system, animation references)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add OPENAI_API_KEY and INGEST_SECRET to .env.local** - no commit (.env.local must not be committed — contains real secrets)
2. **Task 2: Create .env.example at project root** - `4a8d275` (chore)
3. **Task 3: Copy CLAUDE.md and DESIGN.md to project root and append project section** - `8ca6fec` (chore)

## Files Created/Modified
- `.env.local` - Appended OPENAI_API_KEY=your-openai-api-key-here and INGEST_SECRET=your-ingest-secret-here placeholders
- `.env.example` - All 5 required env vars documented; distinguishes auto-injected (Neon) from manual vars; NODE_TLS_REJECT_UNAUTHORIZED warning in comments only
- `CLAUDE.md` - Copied from docs/, then appended ## PROJECT: crowe-ai-onboarding section
- `DESIGN.md` - Copied from docs/; Crowe brand tokens, color palette, typography, animation system

## Decisions Made
- OPENAI_API_KEY and INGEST_SECRET are placeholders only in .env.local — user fills in real values directly; they must also be added to the Vercel dashboard (Settings > Environment Variables) for production and preview
- NODE_TLS_REJECT_UNAUTHORIZED=0 appears only in comments in .env.example as a warning; never as an assignment line; never in Vercel env vars (would break all HTTPS calls including OpenAI API)
- docs/CLAUDE.md and docs/DESIGN.md were not modified — only the root copies were created/modified

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**Two manual steps are required before downstream phases can function:**

1. **Fill in .env.local placeholders:**
   - Open `.env.local` and replace `your-openai-api-key-here` with your real OpenAI API key (must start with `sk-`)
   - Replace `your-ingest-secret-here` with a strong random string (generate with `openssl rand -base64 32`)

2. **Add to Vercel dashboard:**
   - Open Vercel dashboard → crowe-ai-onboarding → Settings → Environment Variables
   - Add `OPENAI_API_KEY` (Production + Preview + Development)
   - Add `INGEST_SECRET` (Production + Preview + Development)
   - Verify: both vars show in the Vercel environment variables list

## Next Phase Readiness
- All 5 required env vars are present in .env.local (Neon vars are real; OPENAI_API_KEY and INGEST_SECRET are placeholders pending user action)
- CLAUDE.md at project root is ready for downstream AI agents to read — contains both universal Crowe standards and project-specific RAG configuration
- DESIGN.md at project root is ready for UI implementation phases
- Phase 2 (Schema Migration) can proceed once user fills in OPENAI_API_KEY and INGEST_SECRET in .env.local and Vercel dashboard

---
*Phase: 01-infrastructure-setup*
*Completed: 2026-03-06*
