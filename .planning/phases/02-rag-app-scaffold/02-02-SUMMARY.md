---
phase: 02-rag-app-scaffold
plan: "02"
subsystem: ui-foundation
tags: [tailwind, brand-tokens, shadcn, css-variables, globals-css, page-placeholder]

# Dependency graph
requires:
  - phase: 02-rag-app-scaffold
    plan: "01"
    provides: Next.js 16.1.6 scaffold, shadcn initialized, globals.css with default CSS variables
provides:
  - tailwind.config.ts with Crowe brand token reference (verbatim from CLAUDE.md Section 2.2)
  - src/app/globals.css with @theme Crowe color tokens (Tailwind v4), Crowe HSL shadcn variable overrides
  - src/app/page.tsx minimal placeholder proving bg-crowe-indigo-dark resolves
  - Brand foundation for Phase 5 UI (class names: bg-crowe-indigo-dark, text-crowe-amber, shadow-crowe-card, font-display, etc.)
affects: [05-ui-polish, 03-ingestion-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tailwind v4 @theme block for custom tokens (replaces tailwind.config.ts theme.extend in v3)
    - shadcn CSS variable override pattern: :root { --primary: HSL values } mapped via @theme inline

key-files:
  created:
    - tailwind.config.ts (reference/documentation artifact — v4 does not read this at build time)
  modified:
    - src/app/globals.css (added @theme Crowe tokens + replaced oklch :root with Crowe HSL values)
    - src/app/page.tsx (replaced create-next-app default with Crowe brand placeholder)

key-decisions:
  - "Tailwind v4 does not use tailwind.config.ts for theme tokens — @theme in globals.css is the v4 mechanism; tailwind.config.ts created as documentation/reference artifact only"
  - "Crowe HSL values (225 33% 98% etc.) replace oklch defaults from shadcn init — no duplicate @layer base block created"
  - "page.tsx is a minimal Server Component with no lib/ imports — sole purpose is to verify bg-crowe-indigo-dark resolves at build time"

# Metrics
duration: 4min
completed: 2026-03-07
---

# Phase 2 Plan 02: Brand Foundation Summary

**Crowe brand token foundation applied: tailwind.config.ts reference, Tailwind v4 @theme tokens, shadcn HSL overrides, and bg-crowe-indigo-dark placeholder page — npm run build exits 0**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T02:26:22Z
- **Completed:** 2026-03-07T02:30:24Z
- **Tasks:** 2
- **Files modified:** 3 (globals.css, page.tsx, tailwind.config.ts created)

## Accomplishments

- `tailwind.config.ts` created with verbatim Crowe brand tokens from CLAUDE.md Section 2.2: crowe.amber, crowe.indigo (dark: `#011E41`), crowe.teal, crowe.cyan, crowe.blue, crowe.violet, crowe.coral, tint scale (50-950), fontFamily (display/body/mono), all boxShadow tokens (crowe-sm through amber-glow using `rgba(1,30,65,x)` only), backgroundColor utilities
- `src/app/globals.css` updated with Crowe brand `@theme` block (Tailwind v4 mechanism for custom classes) and shadcn `:root` HSL overrides from CLAUDE.md Section 4.2
- Spot-checked tokens: crowe.indigo.dark = `#011E41` (verified), tint.200 = `#dfe1e8` (verified), `--primary: 215 98% 13%` (verified), `--background: 225 33% 98%` (verified)
- `src/app/page.tsx` replaced with minimal placeholder using `bg-crowe-indigo-dark flex items-center justify-center` and `font-display` — no imports from lib/
- `npm run build` exits 0; `npx tsc --noEmit` exits 0

## Token Spot-Check

| Token | Expected Value | Verified |
|-------|---------------|----------|
| `crowe.indigo.dark` | `#011E41` | PASS — present in tailwind.config.ts and globals.css |
| `crowe.amber.DEFAULT` | `#F5A800` | PASS |
| `tint.200` | `#dfe1e8` | PASS |
| `--background` | `225 33% 98%` | PASS |
| `--primary` | `215 98% 13%` | PASS |
| `--secondary` | `39 100% 48%` | PASS |
| `--radius` | `0.75rem` | PASS |
| `shadow-crowe-card` | no `rgba(0,0,0,x)` | PASS — uses `rgba(1,30,65,x)` |
| `amber-glow` | `rgba(245,168,0,0.20)` | PASS |

## Task Commits

1. **Task 1: Apply Crowe brand tokens to tailwind.config.ts** — `a796185`
2. **Task 2: Apply shadcn HSL overrides + write page.tsx placeholder** — `02d55fb`

## Globals.css @layer base Blocks

The original `globals.css` from shadcn init had ONE `:root {}` block (not inside `@layer base` — shadcn v4 writes it at root level) and ONE `.dark {}` block, plus a `@layer base { * { ... } body { ... } }` block.

**Resolution:** No duplicate `@layer base :root` blocks existed. The existing single `:root {}` block was replaced with Crowe HSL values. The `.dark {}` block was preserved unchanged. The `@layer base { * body html }` block was preserved unchanged.

**Crowe brand tokens** were added in a new `@theme {}` block above `@theme inline {}` — this is the Tailwind v4 mechanism for custom utility classes.

## Deviations from Plan

### Architectural Note (Tailwind v4)

**[Rule 4 — No stop required — documented only] Tailwind v4 does not use tailwind.config.ts for token generation**

- **Found during:** Task 1 (read postcss.config.mjs, package.json)
- **Issue:** This project uses `tailwindcss@4.2.1` with `@tailwindcss/postcss`. In v4, the `tailwind.config.ts` file is NOT read by the PostCSS plugin — all theme tokens must be defined in CSS via `@theme {}` blocks. Creating tokens only in `tailwind.config.ts` would mean `bg-crowe-indigo-dark` and `shadow-crowe-card` would NOT work as utility classes.
- **Resolution:**
  1. Created `tailwind.config.ts` as a documentation/reference artifact with all verbatim tokens (satisfies plan's grep verification checks, serves as readable reference for future engineers)
  2. Added identical tokens to `globals.css` `@theme {}` block — this is the v4-native mechanism that actually generates the utility classes
  3. Both the grep checks AND the build now pass
- **Impact:** No plan-specified functionality omitted. Class names `bg-crowe-indigo-dark`, `text-crowe-amber`, `shadow-crowe-card`, `font-display` all resolve correctly at build time.
- **This deviation was auto-resolved (Rule 1/3 hybrid) — no user action required**

## Issues Encountered

None beyond the Tailwind v4 deviation documented above.

## User Setup Required

None — `npm run dev` loads the branded placeholder at localhost:3000. Page shows Crowe Indigo Dark background (`#011E41`) with white "Crowe AI Assistant" text (verifiable manually).

## Next Phase Readiness

- Brand token classes (`bg-crowe-indigo-dark`, `text-crowe-amber`, `shadow-crowe-card`, `font-display`, etc.) are available throughout the app
- shadcn components (Button, Card, Input, etc.) will inherit Crowe HSL values via `--primary`, `--secondary`, `--background` CSS variables
- Phase 5 UI can use all Crowe Tailwind classes immediately
- `--background: 225 33% 98%` confirms page background is `#f8f9fc` (never pure white)

---
*Phase: 02-rag-app-scaffold*
*Completed: 2026-03-07*

## Self-Check: PASSED

- tailwind.config.ts: FOUND
- src/app/globals.css: FOUND
- src/app/page.tsx: FOUND
- .planning/phases/02-rag-app-scaffold/02-02-SUMMARY.md: FOUND
- Commit a796185 (Task 1): FOUND
- Commit 02d55fb (Task 2): FOUND
