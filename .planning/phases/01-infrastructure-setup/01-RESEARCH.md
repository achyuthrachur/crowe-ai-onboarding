# Phase 1: Infrastructure Setup - Research

**Researched:** 2026-03-06
**Domain:** Vercel + Neon Postgres + pgvector provisioning, GitHub repo creation, env var management, project root file setup
**Confidence:** HIGH — all decisions are locked in CONTEXT.md; steps are well-documented in existing CLAUDE.md and project SUMMARY.md; no ambiguous technical choices remain for this phase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Neon Postgres Setup**
- Use Vercel Marketplace integration (Storage tab in Vercel dashboard) — not a standalone Neon account
- `vercel env pull .env.local` to auto-populate DATABASE_URL and all Neon-injected env vars locally
- pgvector extension enabled via Neon console SQL editor: `CREATE EXTENSION IF NOT EXISTS vector;` — manual one-time step, not a migration script
- The Neon connection URL to use for pgvector queries is the non-pooling URL (avoids Pgbouncer transaction mode limitations with pgvector)

**CLAUDE.md + DESIGN.md Placement**
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

**GitHub Repo + Vercel Project**
- Create GitHub repo `achyuthrachur/crowe-ai-onboarding` (public) in Phase 1 — Vercel requires a linked repo
- Use gh CLI at full path: `/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe`
- Vercel project under `achyuth-rachurs-projects` team (team_jTMSsUBJBbOqgNTyjjsr9PY2), not personal account
- Vercel project is created fresh — does not already exist
- Vercel link: `NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project crowe-ai-onboarding`

**Environment Variables**
- OPENAI_API_KEY: User has the key — add directly to .env.local and Vercel dashboard (never paste in chat)
- INGEST_SECRET: User will provide a specific value — planner leaves `INGEST_SECRET=your-value-here` placeholder
- Add OPENAI_API_KEY and INGEST_SECRET to Vercel via dashboard (Settings > Environment Variables), not CLI
- DATABASE_URL (and POSTGRES_URL variants): pulled automatically via `vercel env pull`
- `NODE_TLS_REJECT_UNAUTHORIZED=0` is shell-only — never add to .env.local or Vercel env vars

**`.env.example`**
- Create `.env.example` at project root with all required keys documented (no real values)
- Note which vars are auto-injected by Vercel Neon integration vs manually added

### Claude's Discretion
- Exact .env.example format and comments
- Gitignore configuration (.env.local already standard Next.js gitignore behavior)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Vercel project created and linked to GitHub repo `achyuthrachur/crowe-ai-onboarding` | gh CLI path confirmed, Vercel link command documented, team ID confirmed |
| INFRA-02 | Neon Postgres database provisioned and connected to Vercel project (via Vercel Marketplace integration) | Marketplace integration path documented; `vercel env pull` populates DATABASE_URL |
| INFRA-03 | pgvector extension enabled on Neon database | SQL command confirmed: `CREATE EXTENSION IF NOT EXISTS vector;` via Neon console SQL editor |
| INFRA-04 | All required environment variables present in `.env.local` and Vercel production (OPENAI_API_KEY, DATABASE_URL, INGEST_SECRET) | Each var's source and injection method is fully specified |
| INFRA-05 | CLAUDE.md and DESIGN.md present at `crowe-ai-onboarding` project root before any code is written | Source files confirmed at `docs/CLAUDE.md` and `docs/DESIGN.md`; copy command and append content documented |
</phase_requirements>

---

## Summary

Phase 1 is a pure infrastructure and file setup phase — no application code is written. Every step is a manual CLI or console action: create a GitHub repo, link a Vercel project, add a Neon Postgres database from the Vercel Marketplace, enable the pgvector extension, set environment variables, and copy two convention files to the project root.

All technical decisions are locked. The Vercel Marketplace Neon integration is the correct path (not a standalone Neon account) because it auto-injects DATABASE_URL and POSTGRES_URL variants into the Vercel project and into `.env.local` via `vercel env pull`. The pgvector extension is enabled once via the Neon console SQL editor — it is not a migration script. The non-pooling connection URL must be used for pgvector queries because Pgbouncer's transaction mode is incompatible with pgvector's session-level features.

The primary operational constraint throughout this phase is the Crowe corporate SSL proxy. Every Vercel CLI command must be prefixed with `NODE_TLS_REJECT_UNAUTHORIZED=0`. This flag is shell-scope only and must never appear in `.env.local`, `.env.example`, or Vercel environment variable settings. The gh CLI is not on PATH and must be invoked with its full path: `/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe`.

**Primary recommendation:** Execute steps in strict order — Git init → GitHub repo create → Vercel link → Neon provision → pgvector enable → env pull → OPENAI_API_KEY + INGEST_SECRET added to both .env.local and Vercel dashboard → CLAUDE.md and DESIGN.md copied and updated. Each step gates the next.

---

## Standard Stack

### Core (Phase 1 — infrastructure only, no npm packages installed in this phase)

| Tool | Version/Path | Purpose | Note |
|------|-------------|---------|------|
| gh CLI | `/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe` | Create GitHub repo, push code | Not on PATH — use full path |
| Vercel CLI | Already installed globally | Link project, pull env vars, deploy | Prefix all commands with `NODE_TLS_REJECT_UNAUTHORIZED=0` |
| Neon Postgres | Via Vercel Marketplace | Managed Postgres with pgvector | Provisioned through Vercel Storage tab |
| pgvector | Extension in Neon | Vector similarity search | Enabled via `CREATE EXTENSION IF NOT EXISTS vector;` |

### Environment Variables

| Variable | Source | How to Set |
|----------|--------|-----------|
| `DATABASE_URL` | Auto-injected by Neon Marketplace integration | `vercel env pull .env.local` |
| `POSTGRES_URL` | Auto-injected by Neon Marketplace integration | `vercel env pull .env.local` |
| `POSTGRES_URL_NON_POOLING` | Auto-injected by Neon Marketplace integration | `vercel env pull .env.local` |
| `OPENAI_API_KEY` | User provides | Add manually to `.env.local` AND Vercel dashboard |
| `INGEST_SECRET` | User provides specific value | Planner uses placeholder; user fills in; add to `.env.local` AND Vercel dashboard |

**Note:** `POSTGRES_URL_NON_POOLING` is the correct connection string for pgvector queries. The pooling URL goes through Pgbouncer in transaction mode, which is incompatible with pgvector's session-level query behavior.

---

## Architecture Patterns

### Recommended Step Sequence

```
1. git init (in project root — docs/ folder is the only existing content)
2. git add . && git commit -m "chore: initial commit"
3. GH="/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe"
   "$GH" repo create achyuthrachur/crowe-ai-onboarding --public --source=. --remote=origin --push
4. NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project crowe-ai-onboarding
   (Select team: achyuth-rachurs-projects when prompted)
5. In Vercel dashboard > Storage tab: Add Neon Postgres integration
   (Connect to project crowe-ai-onboarding — this injects DATABASE_URL variants)
6. In Neon console SQL editor, run:
   CREATE EXTENSION IF NOT EXISTS vector;
7. NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes
   (Populates DATABASE_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING)
8. Manually add to .env.local:
   OPENAI_API_KEY=<user provides>
   INGEST_SECRET=<user provides>
9. In Vercel dashboard > Settings > Environment Variables:
   Add OPENAI_API_KEY and INGEST_SECRET (production + preview + development)
10. cp docs/CLAUDE.md . && cp docs/DESIGN.md .
11. Append project-specific section to root CLAUDE.md (verbatim from CONTEXT.md)
12. Create .env.example at project root
13. Verify: SELECT * FROM pg_extension WHERE extname = 'vector'; → returns 1 row
```

### Pattern: Non-Pooling URL for pgvector

Always use `POSTGRES_URL_NON_POOLING` (not `POSTGRES_URL`) in the database client for vector similarity queries. The Neon Marketplace integration injects both. The pooling URL routes through Pgbouncer which uses transaction mode — pgvector operations require a persistent session connection.

```typescript
// src/lib/db.ts (Phase 2) should use:
// process.env.POSTGRES_URL_NON_POOLING
// NOT process.env.POSTGRES_URL
```

### Pattern: Shell-Only SSL Workaround

```bash
# CORRECT — prefix each Vercel CLI command
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project crowe-ai-onboarding
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes

# NEVER in .env.local:
# NODE_TLS_REJECT_UNAUTHORIZED=0   ← WRONG — disables TLS for all OpenAI API calls

# NEVER in Vercel environment variables ← WRONG — disables TLS in production
```

### Pattern: .env.example Format

```bash
# .env.example — copy to .env.local and fill in values
# All DATABASE_URL variants are auto-injected by Vercel Neon integration (vercel env pull)
DATABASE_URL=                          # Auto-injected: pooled connection
POSTGRES_URL=                          # Auto-injected: alias for DATABASE_URL
POSTGRES_URL_NON_POOLING=              # Auto-injected: direct non-pooled (use for pgvector)

# Add manually to .env.local AND Vercel dashboard (Settings > Environment Variables)
OPENAI_API_KEY=                        # Required: your OpenAI API key
INGEST_SECRET=                         # Required: any strong random string (protects /api/ingest)
```

### Anti-Patterns to Avoid

- **Standalone Neon account:** Creating a Neon account outside Vercel means DATABASE_URL is not auto-injected and Vercel deployment won't have it without manual steps.
- **Pooling URL for pgvector:** Using `POSTGRES_URL` instead of `POSTGRES_URL_NON_POOLING` will cause silent failures or errors when running vector similarity queries.
- **NODE_TLS_REJECT_UNAUTHORIZED in .env files:** This disables certificate validation globally — all OpenAI API calls from the app would bypass TLS verification.
- **Adding secrets via Vercel CLI:** The `vercel env add` CLI command is less reliable on Crowe network with SSL interception; use the Vercel dashboard instead.
- **Linking to personal Vercel account:** Project must be under `achyuth-rachurs-projects` team (team_jTMSsUBJBbOqgNTyjjsr9PY2). Personal account will mean the Neon integration is separate.
- **Creating pgvector index here:** INFRA-03 only enables the extension. The `CREATE INDEX` on `doc_chunks` belongs in Phase 3 (after ingestion), not Phase 1.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DATABASE_URL injection | Manual curl to Vercel API | Vercel Marketplace Neon integration | Auto-injects all URL variants, keeps prod and local in sync |
| GitHub auth on Crowe network | PAT in shell, manual git push | `gh CLI` with Windows Credential Manager | Credentials already stored; `printf "protocol=https..." \| git credential fill` retrieves token |
| pgvector extension install | npm package, custom vector math | `CREATE EXTENSION IF NOT EXISTS vector;` in Neon SQL editor | Server-side extension — no app code needed |

**Key insight:** This entire phase is provisioning, not programming. Every step uses an existing tool or dashboard. The only "code" written is a `.env.example` file and a text append to CLAUDE.md.

---

## Common Pitfalls

### Pitfall 1: Vercel Links to Personal Account Instead of Team

**What goes wrong:** `vercel link` without `--scope` may prompt or default to the personal account. All subsequent `vercel env pull` commands pull from the wrong project context. Neon integration won't be visible.

**Why it happens:** Vercel CLI remembers the last-used account/team. If the user previously linked a personal project, the default may be wrong.

**How to avoid:** The `vercel link` command in CONTEXT.md includes `--project crowe-ai-onboarding`. During the interactive prompt, explicitly select `achyuth-rachurs-projects` team. Verify by checking `.vercel/project.json` for the correct `orgId` matching `team_jTMSsUBJBbOqgNTyjjsr9PY2`.

**Warning signs:** `.vercel/project.json` shows an orgId that does NOT start with `team_`. That means personal account was selected.

### Pitfall 2: vercel env pull Returns No DATABASE_URL

**What goes wrong:** `.env.local` after `vercel env pull` contains no Neon/Postgres variables.

**Why it happens:** Neon Marketplace integration must be completed in the Vercel dashboard BEFORE running `vercel env pull`. The integration adds the env vars to the Vercel project. If the integration is done after pulling, vars won't be there.

**How to avoid:** Complete step order strictly: Vercel link → Neon integration in dashboard → env pull. If vars are missing, go to Vercel dashboard > Settings > Environment Variables and confirm the Neon vars appear there first.

**Warning signs:** `.env.local` file exists but has no `POSTGRES_*` keys. Run `vercel env pull` again after confirming Neon integration is connected in dashboard.

### Pitfall 3: gh CLI Not Found

**What goes wrong:** Running `gh repo create ...` fails with "command not found" or "gh: No such file or directory."

**Why it happens:** gh CLI is installed at a non-standard path and is not on the system PATH.

**How to avoid:** Always use the full path: `/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe`. Set a shell variable: `GH="/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe"` and use `"$GH"` for all gh commands.

**Warning signs:** Any `gh` command fails immediately without attempting GitHub auth.

### Pitfall 4: Root CLAUDE.md Missing Project-Specific Section

**What goes wrong:** Downstream phases use CLAUDE.md to understand project context. If the project-specific section is not appended, agents won't know the correct connection library (`@neondatabase/serverless`), ingestion secret name, or model parameters.

**Why it happens:** The copy step (`cp docs/CLAUDE.md .`) gets done but the append step is forgotten.

**How to avoid:** The append task must be a distinct, explicit task in the plan — not part of the copy task. Verify by checking that root `CLAUDE.md` contains `## PROJECT: crowe-ai-onboarding`.

**Warning signs:** Root `CLAUDE.md` is identical to `docs/CLAUDE.md` byte-for-byte, or does not contain the string `crowe-ai-onboarding`.

### Pitfall 5: NODE_TLS_REJECT_UNAUTHORIZED Written to .env.local

**What goes wrong:** Developer adds `NODE_TLS_REJECT_UNAUTHORIZED=0` to `.env.local` "for convenience." This disables TLS verification for all HTTPS calls made by the Next.js app, including OpenAI API calls in production.

**Why it happens:** The shell workaround is discovered during Vercel CLI setup; developer assumes it belongs in env file too.

**How to avoid:** The plan must explicitly state "shell-only" for this flag with a note on what NOT to do. The `.env.example` must not contain this variable.

**Warning signs:** `.env.local` or `.env.example` contains `NODE_TLS_REJECT_UNAUTHORIZED`.

### Pitfall 6: pgvector Extension Not Enabled Before Phase 2

**What goes wrong:** Phase 2 creates the `doc_chunks` table with `embedding vector(1536)` column. If pgvector is not enabled, the `CREATE TABLE` SQL fails.

**Why it happens:** pgvector step (INFRA-03) is overlooked because it's a one-liner in the Neon SQL editor.

**How to avoid:** Verify after enabling: `SELECT * FROM pg_extension WHERE extname = 'vector';` must return one row. Make this the explicit success criterion for the INFRA-03 task.

**Warning signs:** Phase 2 table creation SQL errors with "type vector does not exist."

---

## Code Examples

### Verify pgvector Is Enabled (Neon SQL Editor)

```sql
-- Run in Neon console SQL editor after enabling extension
-- Must return exactly 1 row
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Root CLAUDE.md Append Content (verbatim)

```markdown
## PROJECT: crowe-ai-onboarding
- RAG app: OpenAI text-embedding-3-small + gpt-4o
- Knowledge base docs in /docs (01- through 08-) — edit, then npm run ingest
- 00-PRD.md in /docs is excluded from ingestion
- Vercel Postgres + pgvector — connection via @neondatabase/serverless
- OpenAI only — never add Anthropic API dependencies
- temperature: 0.2, topK: 5, similarity threshold: 0.3
- INGEST_SECRET protects /api/ingest route
```

### GitHub Repo Creation (Crowe Network)

```bash
# Source: docs/CLAUDE.md Section 5 — Deployment
GH="/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe"
"$GH" repo create achyuthrachur/crowe-ai-onboarding --public --description "RAG-powered onboarding assistant for Crowe AI practice" --source=. --remote=origin --push
```

### Vercel Link (Crowe Network SSL workaround)

```bash
# Source: docs/CLAUDE.md Section 5 + CONTEXT.md
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project crowe-ai-onboarding
# When prompted for team/scope: select achyuth-rachurs-projects
```

### Verify Vercel Linked to Correct Team

```bash
# After vercel link, check .vercel/project.json
cat .vercel/project.json
# orgId should be: team_jTMSsUBJBbOqgNTyjjsr9PY2
```

### Env Pull After Neon Integration

```bash
# Run AFTER Neon Marketplace integration is complete in Vercel dashboard
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes
# Verify: .env.local should now contain POSTGRES_URL_NON_POOLING
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/postgres` npm package | `@neondatabase/serverless` | Q4 2024 — Vercel migrated to Neon | `@vercel/postgres` is deprecated; using it will cause warnings and eventually break |
| Standalone Neon account | Vercel Marketplace Neon integration | 2024 | Integration auto-injects env vars; standalone requires manual env var management |

**Deprecated/outdated:**
- `@vercel/postgres`: Officially deprecated as of Q4 2024 per Neon transition guide. The CONTEXT.md project section already correctly specifies `@neondatabase/serverless` — this is the right choice.

---

## Open Questions

1. **INGEST_SECRET value**
   - What we know: User will provide a specific value. Planner uses placeholder `INGEST_SECRET=your-value-here`.
   - What's unclear: Whether user already has a value chosen or needs to generate one.
   - Recommendation: Plan task should prompt user to provide value and add to both `.env.local` and Vercel dashboard. Include a tip to generate a random string with `openssl rand -base64 32` if they don't have one.

2. **Vercel CLI team selection interaction**
   - What we know: `vercel link --yes` auto-confirms but may still prompt for team selection if multiple teams exist.
   - What's unclear: Whether `--yes` suppresses the team selector or just the project name confirmation.
   - Recommendation: If `--yes` does not select the team automatically, the plan should document the interactive step to select `achyuth-rachurs-projects`. The `--scope` flag can be added if needed: `vercel link --yes --project crowe-ai-onboarding --scope achyuth-rachurs-projects`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — Phase 1 is infrastructure-only; no application code exists yet |
| Config file | N/A |
| Quick run command | Shell verification commands (see below) |
| Full suite command | All 5 verification checks below must pass |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Vercel project linked to GitHub repo | manual | `cat .vercel/project.json` — orgId must be `team_jTMSsUBJBbOqgNTyjjsr9PY2` | ❌ Wave 0 (created during task) |
| INFRA-02 | Neon Postgres provisioned and connected | manual | `NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes && grep POSTGRES_URL .env.local` — must have value | ❌ Wave 0 |
| INFRA-03 | pgvector extension enabled | manual | Run in Neon SQL editor: `SELECT * FROM pg_extension WHERE extname = 'vector';` — must return 1 row | ❌ Wave 0 |
| INFRA-04 | All env vars present | manual | `grep -E 'OPENAI_API_KEY|DATABASE_URL|INGEST_SECRET' .env.local` — all 3 must have non-empty values | ❌ Wave 0 |
| INFRA-05 | CLAUDE.md and DESIGN.md at project root | smoke | `test -f CLAUDE.md && test -f DESIGN.md && grep 'crowe-ai-onboarding' CLAUDE.md` — all must pass | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run the specific verification check for that task (listed above)
- **Per wave merge:** All 5 checks must pass before moving to Phase 2
- **Phase gate:** All INFRA-01 through INFRA-05 verified before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `.vercel/project.json` — created when `vercel link` succeeds
- [ ] `.env.local` — created when `vercel env pull` succeeds (gitignored)
- [ ] `CLAUDE.md` at project root — created by copy + append task
- [ ] `DESIGN.md` at project root — created by copy task
- [ ] `.env.example` — created by plan task
- [ ] No test framework install needed — all verification is shell/SQL commands

---

## Sources

### Primary (HIGH confidence)
- `docs/CLAUDE.md` (project root) — gh CLI path, Vercel commands, SSL proxy workaround, team IDs, all confirmed
- `docs/00-PRD.md` — env var names, project structure, exact project-specific CLAUDE.md section content
- `.planning/phases/01-infrastructure-setup/01-CONTEXT.md` — all locked decisions, full step-by-step approach
- `.planning/research/SUMMARY.md` — @vercel/postgres deprecation, non-pooling URL requirement for pgvector, overall architecture rationale

### Secondary (MEDIUM confidence)
- [Neon Docs — Vercel Postgres Transition Guide](https://neon.com/docs/guides/vercel-postgres-transition-guide) — confirmed `@vercel/postgres` deprecated, `@neondatabase/serverless` is successor (cited in SUMMARY.md)
- [Neon Docs — pgvector](https://neon.com/docs/extensions/pgvector) — `CREATE EXTENSION IF NOT EXISTS vector;` syntax confirmed (cited in SUMMARY.md)

### Tertiary (LOW confidence)
- None — all critical claims are backed by project documentation or cited official sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling versions and paths are confirmed in CLAUDE.md and CONTEXT.md
- Architecture (step order): HIGH — each step has a clear dependency on the previous; no ambiguity
- Pitfalls: HIGH — most pitfalls are documented from prior experience in SUMMARY.md and CONTEXT.md; SSL proxy pitfall is explicitly called out in CLAUDE.md
- Validation: HIGH — verification commands are deterministic shell and SQL checks

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (stable infrastructure patterns; Neon/Vercel integration UI may change but workflow stays the same)
