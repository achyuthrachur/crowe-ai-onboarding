---
phase: 1
slug: infrastructure-setup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — pure infrastructure phase, no application code |
| **Config file** | none |
| **Quick run command** | `echo $OPENAI_API_KEY && echo $DATABASE_URL && echo $INGEST_SECRET` |
| **Full suite command** | See Manual-Only Verifications below |
| **Estimated runtime** | ~2 minutes (manual checks) |

---

## Sampling Rate

- **After every task commit:** Verify the specific artifact created (file exists, env var present, or SQL check passes)
- **After every plan wave:** Run full manual verification checklist
- **Before `/gsd:verify-work`:** All success criteria must pass
- **Max feedback latency:** Immediate — each task has a deterministic verification command

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | INFRA-01 | manual | `GH repo: gh repo view achyuthrachur/crowe-ai-onboarding` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | INFRA-01 | manual | `Vercel: vercel ls \| grep crowe-ai-onboarding` | ❌ W0 | ⬜ pending |
| 1-02-01 | 01 | 2 | INFRA-02 | manual | `Neon: vercel env pull .env.local --yes && cat .env.local \| grep DATABASE` | ❌ W0 | ⬜ pending |
| 1-02-02 | 01 | 2 | INFRA-03 | manual | `SQL: SELECT * FROM pg_extension WHERE extname = 'vector'` | ❌ W0 | ⬜ pending |
| 1-03-01 | 01 | 3 | INFRA-04 | automated | `echo $OPENAI_API_KEY \| head -c 20` | ✅ | ⬜ pending |
| 1-03-02 | 01 | 3 | INFRA-04 | automated | `echo $DATABASE_URL \| grep -c neon` | ✅ | ⬜ pending |
| 1-03-03 | 01 | 3 | INFRA-04 | automated | `echo $INGEST_SECRET \| wc -c` | ✅ | ⬜ pending |
| 1-04-01 | 01 | 4 | INFRA-05 | automated | `test -f CLAUDE.md && test -f DESIGN.md && echo "PASS"` | ✅ | ⬜ pending |
| 1-04-02 | 01 | 4 | INFRA-05 | automated | `grep -c "PROJECT: crowe-ai-onboarding" CLAUDE.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — this is a pure infrastructure phase. No test framework installation or stub files needed. All verification is either deterministic shell commands or SQL queries run against the live Neon console.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Neon Postgres appears in Vercel integrations dashboard | INFRA-02 | Visual dashboard check only | Open Vercel project → Storage tab → confirm Neon DB is listed |
| pgvector extension enabled | INFRA-03 | Requires Neon console SQL access | Open Neon dashboard → SQL Editor → run `SELECT * FROM pg_extension WHERE extname = 'vector'` → expect 1 row |
| Vercel project linked to GitHub repo | INFRA-01 | Requires Vercel dashboard inspection | Open Vercel project → Settings → Git → confirm linked to `achyuthrachur/crowe-ai-onboarding` |
| Env vars present in Vercel production | INFRA-04 | Vercel dashboard only | Open Vercel project → Settings → Environment Variables → confirm OPENAI_API_KEY, DATABASE_URL, INGEST_SECRET all listed for Production |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual instructions
- [ ] Sampling continuity: no 3 consecutive tasks without verification step
- [ ] Wave 0: N/A (no test framework needed)
- [ ] No watch-mode flags
- [ ] Feedback latency: immediate (shell commands and SQL, < 10s each)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
