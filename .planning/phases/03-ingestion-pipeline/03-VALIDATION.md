---
phase: 3
slug: ingestion-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — no test runner installed; verification via shell + SQL |
| **Config file** | none |
| **Quick run command** | `node -e "const p=require('./package.json');process.exit(p.scripts.ingest?0:1)" && echo PASS` |
| **Full suite command** | See Manual-Only Verifications below (SQL queries via Neon console) |
| **Estimated runtime** | ~3 minutes (ingest run + SQL checks) |

---

## Sampling Rate

- **After every task commit:** Verify the specific artifact created (file exists, script runs, or SQL check passes)
- **After every plan wave:** Run full manual verification checklist
- **Before `/gsd:verify-work`:** All success criteria must pass
- **Max feedback latency:** Immediate for shell checks; ~30s for SQL queries via Neon console

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | INGS-01 | automated | `test -f src/lib/ingest.ts && echo PASS` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | INGS-01,02 | automated | `test -f scripts/ingest.ts && echo PASS` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | INGS-05 | automated | `node -e "const p=require('./package.json');process.exit(p.scripts.ingest?0:1)" && echo PASS` | ✅ | ⬜ pending |
| 3-02-01 | 02 | 2 | INGS-01,03,07 | manual | `export $(grep -v '^#' .env.local \| xargs) && npm run ingest` — observe logs, check Neon | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | INGS-03 | manual | Run ingest twice; `SELECT COUNT(*) FROM doc_chunks;` must match both times | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | INGS-04 | manual | `SELECT indexname FROM pg_indexes WHERE tablename = 'doc_chunks';` returns `doc_chunks_embedding_idx` | ❌ W0 | ⬜ pending |
| 3-02-04 | 02 | 2 | INGS-07 | manual | `SELECT COUNT(*) FROM doc_chunks WHERE embedding IS NULL;` returns 0; `SELECT vector_dims(embedding) FROM doc_chunks LIMIT 1;` returns 1536 | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 3 | INGS-06 | manual | curl: POST /api/ingest with no header → 401; wrong header → 401; missing env → 500; correct → 200 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — this phase has no test framework. All verification is manual shell commands and SQL queries run against the live Neon console.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run ingest` logs exactly 8 docs (01–08), skips `00-PRD.md` | INGS-01 | Requires env vars exported + live OpenAI call | `export $(grep -v '^#' .env.local \| xargs) && npm run ingest` — observe per-doc log lines |
| Embedding batch: 8 OpenAI calls, not 80+ | INGS-02 | Cannot inspect API calls without proxy | Observe ingest speed (~1-2s per doc) and final summary line |
| Row count stable on re-run (idempotency) | INGS-03 | Requires live Neon DB | Run ingest twice; `SELECT COUNT(*) FROM doc_chunks;` must return same count both times |
| IVFFlat index created after ingest | INGS-04 | Requires live Neon DB | `SELECT indexname FROM pg_indexes WHERE tablename = 'doc_chunks';` → must return `doc_chunks_embedding_idx` |
| Non-null embeddings, dims = 1536 | INGS-07 | Requires live Neon DB | `SELECT COUNT(*) FROM doc_chunks WHERE embedding IS NULL;` → 0; `SELECT vector_dims(embedding) FROM doc_chunks LIMIT 1;` → 1536 |
| `/api/ingest` fail-closed auth | INGS-06 | Requires running Next.js dev server | See curl commands in RESEARCH.md Validation Architecture section |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual instructions
- [ ] Sampling continuity: no 3 consecutive tasks without verification step
- [ ] Wave 0: N/A (no test framework needed)
- [ ] No watch-mode flags
- [ ] Feedback latency: immediate for shell; ~30s for SQL
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
