---
phase: 4
slug: chat-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (CLAUDE.md §4.1 default — `Vitest + React Testing Library`) |
| **Config file** | `vitest.config.ts` — Wave 0 creates this |
| **Quick run command** | `npx vitest run src/lib/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds (unit tests only; integration tests are manual curl) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/` (unit tests for pure functions)
- **After every plan wave:** Run full unit suite + manual curl smoke tests
- **Before `/gsd:verify-work`:** All unit tests green + all manual integration checks pass
- **Max feedback latency:** ~5s for unit tests; ~30s for manual curl checks

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-W0-01 | W0 | 0 | CHAT-04,05,06 | automated | `test -f vitest.config.ts && echo PASS` | ❌ W0 | ⬜ pending |
| 4-W0-02 | W0 | 0 | CHAT-04,05,06 | automated | `test -f src/lib/retrieval.test.ts && echo PASS` | ❌ W0 | ⬜ pending |
| 4-01-01 | 01 | 1 | CHAT-03,04,06 | automated | `npx vitest run src/lib/retrieval.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | CHAT-03 | automated | `grep -n "1 - (embedding <=>" src/lib/retrieval.ts && echo PASS` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | CHAT-01,02,05,07,08 | manual | curl on-topic query — see commands below | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | CHAT-05 | automated | `npx vitest run --reporter=verbose` (fallback unit test) | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 2 | CHAT-08 | manual | curl "what colors does Crowe use?" → inspect sources for branding doc | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D vitest @vitejs/plugin-react` — install test framework
- [ ] `vitest.config.ts` — Vitest config at project root
- [ ] `src/lib/retrieval.test.ts` — stubs for `condenseHistoryForRetrieval`, `truncateHistory`, `deduplicateSources`

Install command:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install -D vitest @vitejs/plugin-react
```

vitest.config.ts stub:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

test script in package.json:
```json
"test": "vitest run",
"test:watch": "vitest"
```

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| On-topic query returns grounded reply + sources | CHAT-01, CHAT-08 | Requires live Neon DB + OpenAI API | `curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"what colors does Crowe use?","history":[]}'` — verify `reply` is non-empty string, `sources` array has ≥1 entry with `docId` from branding doc |
| Off-topic query returns exact fallback text | CHAT-05 | Requires live inference to confirm no GPT call made | `curl ... -d '{"message":"what is the capital of France?","history":[]}'` — verify `reply === "I don't have information on that in the knowledge base."` and `sources.length === 0` |
| Multi-turn history affects retrieval | CHAT-02 | Requires live embedding + retrieval | Send follow-up "what about typography?" with prior history — verify relevant chunks retrieved |
| GPT-4o called with correct settings | CHAT-07 | Live API call required | Inspect Vercel/dev logs for `temperature:0.2`, `max_tokens:800`, `stream:false` |
| Cosine distance comment visible in source | CHAT-03 | Code inspection | `grep -n "distance" src/lib/retrieval.ts` — must explain `<=>` is distance, `1-x` converts to similarity |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual instructions
- [ ] Sampling continuity: no 3 consecutive tasks without verification step
- [ ] Wave 0: Vitest installed, `vitest.config.ts` created, `src/lib/retrieval.test.ts` stub created
- [ ] No watch-mode flags in automated commands
- [ ] Feedback latency: ~5s for unit tests, ~30s for manual curl
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
