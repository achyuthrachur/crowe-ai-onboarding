---
phase: 2
slug: rag-app-scaffold
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (`tsc --noEmit`) + Next.js build (`npm run build`) |
| **Config file** | `tsconfig.json` (created by create-next-app) |
| **Quick run command** | `npm run typecheck` or `npx tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds (typecheck), ~60 seconds (full build) |

---

## Sampling Rate

- **After every task commit:** Run quick typecheck or file-existence check as noted per task
- **After every plan wave:** Run `npm run build` — must produce zero TypeScript errors
- **Before `/gsd:verify-work`:** Full build must be green + manual DB and brand checks
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 02-01 | 1 | RAGG-01 | automated | `test -f package.json && npm run dev -- --help` | ✅ | ⬜ pending |
| 2-01-02 | 02-01 | 1 | RAGG-02 | automated | `grep -c "crowe-indigo" tailwind.config.ts` | ✅ | ⬜ pending |
| 2-01-03 | 02-01 | 1 | RAGG-02 | automated | `grep -c "crowe-indigo" src/app/globals.css` | ✅ | ⬜ pending |
| 2-02-01 | 02-02 | 2 | RAGG-03 | manual | SQL: `\d doc_chunks` in Neon console | ❌ W0 | ⬜ pending |
| 2-02-02 | 02-02 | 2 | RAGG-04 | automated | `npx tsc --noEmit` (db.ts import check) | ✅ | ⬜ pending |
| 2-02-03 | 02-02 | 2 | RAGG-05 | automated | `npx tsc --noEmit` (chunker.ts import check) | ✅ | ⬜ pending |
| 2-02-04 | 02-02 | 2 | RAGG-06 | automated | `npx tsc --noEmit` (embeddings.ts import check) | ✅ | ⬜ pending |
| 2-02-05 | 02-02 | 2 | RAGG-07 | automated | `ls docs/01-*.md docs/08-*.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/typecheck-libs.ts` — minimal import test for db.ts, chunker.ts, embeddings.ts (or use `tsc --noEmit` directly)

If `tsc --noEmit` covers all three lib files after scaffold, no Wave 0 stub files needed.

*Note: RAGG-03 (doc_chunks schema) requires SQL console access — manual verification only. All other requirements have automated checks via TypeScript compiler.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| doc_chunks table schema correct | RAGG-03 | Requires Neon SQL console | Open Neon dashboard → SQL Editor → run `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='doc_chunks' ORDER BY ordinal_position` → verify 7 columns including `embedding` |
| Brand colors render correctly in browser | RAGG-02 | Visual check | Run `npm run dev`, open localhost:3000, inspect: page bg `#f8f9fc`, any indigo element `#011E41` |
| No IVFFlat index present | RAGG-03 | Correctness gate | In Neon SQL: `SELECT indexname FROM pg_indexes WHERE tablename='doc_chunks'` → expect 0 rows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual instructions
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0: covered by `tsc --noEmit` (no additional stub files needed)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
