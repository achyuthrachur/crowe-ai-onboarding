---
phase: 02-rag-app-scaffold
plan: "01"
subsystem: infra
tags: [nextjs, typescript, tailwind, shadcn, neon, openai, scaffold]

# Dependency graph
requires:
  - phase: 01-infrastructure-setup
    provides: Git repo, Vercel project link, Neon DB, .env.local with connection strings
provides:
  - Next.js 16.1.6 App Router project scaffold at repo root
  - package.json with @neondatabase/serverless ^1.0.2 and openai ^6.27.0
  - tsconfig.json with App Router compatible TypeScript config
  - components.json (shadcn/ui configuration)
  - src/app/globals.css with shadcn CSS variable block
  - src/components/ui/button.tsx and src/lib/utils.ts (shadcn base utilities)
  - next.config.ts configured for Crowe network (system TLS certs, turbopack root)
affects: [03-ingestion-pipeline, 04-rag-api, 05-ui-polish, 06-testing]

# Tech tracking
tech-stack:
  added:
    - next@16.1.6 (App Router, Turbopack)
    - react@19.2.3
    - typescript@5
    - tailwindcss@4
    - shadcn@4.0.0
    - "@neondatabase/serverless@^1.0.2"
    - openai@^6.27.0
    - class-variance-authority, clsx, tailwind-merge (shadcn utilities)
    - lucide-react (shadcn icon set)
  patterns:
    - App Router (src/app/ directory structure)
    - shadcn/ui component library with Radix primitives
    - Turbopack build pipeline with system TLS certs for Crowe network

key-files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - components.json
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/components/ui/button.tsx
    - src/lib/utils.ts
  modified:
    - .gitignore (updated by create-next-app)
    - next.config.ts (Crowe network TLS + turbopack root fix applied post-scaffold)
    - src/app/layout.tsx (Google Fonts removed, Crowe network cannot reach fonts.googleapis.com)

key-decisions:
  - "next.config.ts (not .js) generated — Next.js 16 defaults to TypeScript config"
  - "Next.js 16.1.6 installed (plan said 14 but create-next-app@latest resolves to current stable)"
  - "Google Fonts (next/font/google) removed from layout.tsx — Crowe SSL proxy blocks fonts.googleapis.com at build time"
  - "turbopackUseSystemTlsCerts: true added to next.config.ts — required for Crowe network TLS"
  - "turbopack.root set explicitly to __dirname — fixes workspace root detection when C:/Users/RachurA/package-lock.json exists"
  - "shadcn@latest init --defaults used (not --yes alone) — shadcn 4.x requires --defaults flag to suppress interactive prompts"

patterns-established:
  - "NODE_TLS_REJECT_UNAUTHORIZED=0 required for all npm/npx commands on Crowe network (shell-only, never in .env)"
  - "next.config.ts must always include turbopackUseSystemTlsCerts: true for local builds on Crowe machines"
  - "Google Fonts cannot be used — use local fonts or system font stacks; Crowe brand fonts handled via CSS in Plan 02"

requirements-completed: [RAGG-01]

# Metrics
duration: 6min
completed: 2026-03-07
---

# Phase 2 Plan 01: RAG App Scaffold Summary

**Next.js 16.1.6 App Router scaffold with @neondatabase/serverless, openai, and shadcn/ui initialized; configured for Crowe network TLS constraints**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-07T02:17:13Z
- **Completed:** 2026-03-07T02:23:06Z
- **Tasks:** 2
- **Files modified:** 17 (scaffold) + 5 (Task 2 deps + fixes)

## Accomplishments

- Next.js 16.1.6 App Router scaffold created in existing repo root without overwriting CLAUDE.md, DESIGN.md, docs/, .env files, or .planning/
- @neondatabase/serverless and openai installed and present in package.json dependencies
- shadcn/ui initialized: components.json exists, globals.css contains full CSS variable block with --background, --primary, and sidebar variables
- npm run build exits 0 with Turbopack after fixing two Crowe-network-specific build blockers

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 14 App Router project** - `0aa6a6e` (feat)
2. **shadcn auto-commit** - `4426279` (shadcn init auto-committed components.json, button.tsx, utils.ts, globals.css)
3. **Task 2: Install deps, init shadcn, Crowe network fixes** - `ef4a7e2` (feat)

**Plan metadata:** (docs commit — created after this summary)

## Files Created/Modified

- `package.json` - Next.js 16.1.6, React 19, TypeScript 5, Tailwind 4, @neondatabase/serverless, openai, shadcn utilities
- `tsconfig.json` - App Router compatible TypeScript configuration
- `next.config.ts` - Turbopack root + system TLS certs for Crowe network
- `components.json` - shadcn/ui configuration (Radix library, default style, CSS variables)
- `src/app/globals.css` - Tailwind 4 + shadcn CSS variable block (--background, --primary, sidebar, chart variables)
- `src/app/layout.tsx` - Root layout without Google Fonts (removed for Crowe network compatibility)
- `src/app/page.tsx` - Default Next.js home page (placeholder, replaced in Plan 02)
- `src/components/ui/button.tsx` - shadcn Button component (installed by --defaults)
- `src/lib/utils.ts` - shadcn cn() utility (clsx + tailwind-merge)
- `.gitignore` - Updated by create-next-app (node_modules, .next, .env*, etc.)
- `public/` - SVG assets from scaffold (file.svg, globe.svg, next.svg, vercel.svg, window.svg)

## Decisions Made

- **Next.js version:** create-next-app@latest resolved to Next.js 16.1.6 (plan specified "14" as intent but command spec used `@latest`). No impact — App Router API is identical.
- **next.config.ts not .js:** Next.js 16 defaults to TypeScript config file. Downstream tasks should reference `next.config.ts`.
- **Google Fonts removed:** Crowe SSL proxy blocks `fonts.googleapis.com` at build time. layout.tsx uses no custom font loader. Brand fonts (Helvetica Now) will be handled via CSS in Plan 02-02 or Phase 5.
- **shadcn --defaults flag required:** shadcn 4.x init ignores `--yes` for the component library selection prompt. `--defaults` is the correct non-interactive flag.
- **Turbopack workspace root:** A `package-lock.json` at `C:\Users\RachurA\` causes Turbopack to misdetect workspace root. Fixed by setting `turbopack.root: path.resolve(__dirname)` in next.config.ts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] create-next-app@latest exits with conflict error instead of accepting --yes**
- **Found during:** Task 1 (scaffold)
- **Issue:** create-next-app 16.x exits with error code 1 when conflicting files exist (.env.example, .env.local, .planning/, .vercel/, CLAUDE.md, DESIGN.md), ignoring --yes flag
- **Fix:** Temporarily moved conflicting files to /tmp/crowe-ai-backup/, ran scaffold, restored all files immediately after
- **Files modified:** None permanently — all pre-existing files fully restored
- **Verification:** CLAUDE.md, DESIGN.md, docs/, .env.example, .env.local, .planning/, .vercel/ all verified present after restore
- **Committed in:** `0aa6a6e` (Task 1 commit)

**2. [Rule 1 - Bug] Google Fonts fetch fails at build time on Crowe network**
- **Found during:** Task 2 verification (`npm run build`)
- **Issue:** Default layout.tsx imports Geist and Geist_Mono from `next/font/google`. Crowe SSL proxy blocks `fonts.googleapis.com`, causing Turbopack build to fail with TLS error
- **Fix:** Removed `next/font/google` imports from layout.tsx; body uses `antialiased` class only; metadata title updated to "Crowe AI Onboarding"
- **Files modified:** `src/app/layout.tsx`
- **Verification:** `npm run build` exits 0 after fix
- **Committed in:** `ef4a7e2` (Task 2 commit)

**3. [Rule 1 - Bug] Turbopack incorrectly detects workspace root as C:\Users\RachurA\**
- **Found during:** Task 2 verification (`npm run build`)
- **Issue:** Turbopack finds `C:\Users\RachurA\package-lock.json` and treats the user home directory as workspace root, emitting a build warning
- **Fix:** Added `turbopack: { root: path.resolve(__dirname) }` and `experimental: { turbopackUseSystemTlsCerts: true }` to next.config.ts
- **Files modified:** `next.config.ts`
- **Verification:** Build warning eliminated; `npm run build` exits 0
- **Committed in:** `ef4a7e2` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3x Rule 1 - Bug)
**Impact on plan:** All auto-fixes required for the build to succeed on Crowe network infrastructure. No scope creep. No plan-specified functionality omitted.

## Issues Encountered

- **shadcn auto-commit:** shadcn@latest init automatically ran `git commit` during initialization, creating a commit (`4426279`) with message "feat: initial commit". This is shadcn's default behavior. The commit is valid and contains the correct Task 2 artifacts (components.json, globals.css updates, button.tsx, utils.ts).
- **Plan said "Next.js 14" but installed 16.1.6:** The plan's objective mentions "Next.js 14" but the task action explicitly uses `create-next-app@latest`. Version 16 is the current LTS and has identical App Router behavior.

## User Setup Required

None — no external service configuration required for this plan. All dependencies are already in .env.local from Phase 1.

## Next Phase Readiness

- Next.js App Router scaffold is complete and building successfully
- @neondatabase/serverless and openai are installed, ready for API route implementation in Plans 02-02+
- shadcn/ui is initialized; individual components (Button, Card, Input, etc.) can be added via `npx shadcn@latest add <component>` as needed in Phase 5
- Crowe network TLS configuration is established in next.config.ts — downstream plans should keep `turbopackUseSystemTlsCerts: true`
- Google Fonts are not available; Plan 02-02 or Phase 5 should add Helvetica Now via local font files or CSS @font-face

---
*Phase: 02-rag-app-scaffold*
*Completed: 2026-03-07*

## Self-Check: PASSED

- All 9 key files verified present on disk
- All 3 task commits verified in git log (0aa6a6e, 4426279, ef4a7e2)
- npm run build exits 0 (verified during execution)
