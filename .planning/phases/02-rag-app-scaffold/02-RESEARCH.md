# Phase 2: RAG App Scaffold - Research

**Researched:** 2026-03-06
**Domain:** Next.js 14 App Router scaffold, Tailwind/shadcn brand foundation, Neon Postgres schema, lib utilities (db, chunker, embeddings)
**Confidence:** HIGH (all decisions locked in CONTEXT.md; patterns are well-established; brand tokens copied verbatim from CLAUDE.md)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Next.js init command:**
  ```bash
  NODE_TLS_REJECT_UNAUTHORIZED=0 npx create-next-app@latest . \
    --typescript --tailwind --eslint --app --src-dir \
    --import-alias "@/*" --yes
  ```
  Run in existing project root (`.`) — not a subdirectory. `--yes` skips conflict prompts.

- **Brand foundation:** Apply full brand in Phase 2 (not deferred). Scope:
  1. `tailwind.config.ts` — Crowe color tokens, custom shadows, background colors, font families, border radius tokens
  2. `src/app/globals.css` — shadcn CSS variable overrides (HSL values from CLAUDE.md Section 4.2) + Crowe semantic tokens as CSS vars
  3. `shadcn/ui init only` — `npx shadcn@latest init`, no individual components installed

- **page.tsx:** Minimal placeholder only — a `<div>` with "Crowe AI Assistant" text on `bg-crowe-indigo-dark text-white` background. Enough to verify brand tokens work.

- **Database schema:** `doc_chunks` table only — NO IVFFlat index (index in Phase 3). Schema:
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

- **lib/db.ts:** Use `@neondatabase/serverless` (NOT `@vercel/postgres` — deprecated Q4 2024). Connect via `POSTGRES_URL_NON_POOLING` (NOT `DATABASE_URL` — pgvector requires session-level, non-pooled connection). Export a `sql` tagged template function.

- **lib/chunker.ts:**
  - Token counting: character-based estimate (4 chars ≈ 1 token) — no tiktoken
  - Named constants at top of file:
    ```typescript
    const MAX_CHUNK_CHARS = 2400  // ~600 tokens
    const MIN_CHUNK_CHARS = 400   // ~100 tokens
    const OVERLAP_CHARS = 200     // ~50 tokens
    ```
  - Split strategy: heading boundaries first (`## ` and `### `), then `\n\n` if section exceeds MAX_CHUNK_CHARS
  - Chunk format: `"## Section Title\n\n[body text]"`
  - Merge strategy: sections under MIN_CHUNK_CHARS merged with next sibling
  - Return type per chunk: `{ docId, docTitle, chunkIndex, content }`

- **lib/embeddings.ts:** OpenAI SDK (`openai` package). Model: `text-embedding-3-small` (1536 dimensions). Export `embedText(text: string): Promise<number[]>`. Use `OPENAI_API_KEY` from env.

- **docs/ folder:** RAGG-07 is pre-satisfied — `docs/01-` through `docs/08-` already have real content. Skip stub creation entirely. Note in plan.

- **IVFFlat index:** NOT created in this phase. Phase 3 only.

### Claude's Discretion

- Exact TypeScript strictness settings in `tsconfig.json` — use Next.js 14 defaults
- Font loading strategy for Helvetica Now — use fallback stack (`Arial, 'Helvetica Neue', system-ui, sans-serif`) since fonts aren't licensed
- Exact `next.config.ts` contents — use Next.js 14 defaults
- Whether to create `src/lib/prompt.ts` now or in Phase 4 — defer to Phase 4

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RAGG-01 | Next.js 14 App Router project initialized with TypeScript, Tailwind CSS, shadcn/ui | create-next-app flags locked; shadcn init pattern documented below |
| RAGG-02 | Crowe brand tokens in `globals.css` and `tailwind.config.ts` matching DESIGN.md | Full tailwind config and shadcn HSL overrides extracted from CLAUDE.md verbatim |
| RAGG-03 | `doc_chunks` table created in Neon Postgres (no index at this stage) | Schema locked in CONTEXT.md; `@neondatabase/serverless` pattern documented |
| RAGG-04 | `src/lib/db.ts` — Neon serverless Postgres client | `@neondatabase/serverless` neon() + sql pattern; POSTGRES_URL_NON_POOLING env var |
| RAGG-05 | `src/lib/chunker.ts` — heading-aware markdown chunker | Character-based constants, heading split logic, merge strategy all specified |
| RAGG-06 | `src/lib/embeddings.ts` — OpenAI embeddings wrapper | openai SDK embeddings.create() pattern; text-embedding-3-small 1536 dims |
| RAGG-07 | `docs/` folder with 8 stub markdown files | Pre-satisfied — docs/01-08 already exist with real content; no action needed |
</phase_requirements>

---

## Summary

Phase 2 establishes the runnable application foundation: Next.js 14 initialized in the existing project root, the full Crowe brand applied via Tailwind config and CSS variables, the `doc_chunks` Postgres table created, and three lib utilities written and importable. No API routes, no UI components, no ingestion — just scaffolding.

All major decisions are locked in CONTEXT.md. Research focus is therefore on exact code patterns (not alternative-selection): how `@neondatabase/serverless` exposes its `sql` tagged template, how create-next-app behaves when run in a non-empty directory, and how to correctly wire shadcn's HSL CSS variable overrides alongside custom Tailwind tokens without conflicts.

The brand token source of truth is CLAUDE.md Section 2.2 (Tailwind config) and Section 4.2 (shadcn HSL overrides). Both sections are reproduced verbatim in this document so the planner can copy values directly without re-reading CLAUDE.md.

**Primary recommendation:** Execute each of the seven deliverables in order as discrete tasks. The create-next-app step is a prerequisite for everything else (it creates package.json, tsconfig.json, tailwind.config.ts, and globals.css). Brand application immediately follows so that the verification step (`npm run dev` showing the branded placeholder) closes the phase gate.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14.x | App Router framework | Locked by PRD |
| @neondatabase/serverless | latest | Neon Postgres driver; `sql` tagged template | @vercel/postgres deprecated Q4 2024 |
| openai | ^6.27.0 | Embeddings API client | Locked by PRD; direct SDK (no LangChain/AI SDK) |
| tailwindcss | 3.x (via create-next-app) | Utility CSS | Included by create-next-app --tailwind |
| shadcn/ui | latest (`npx shadcn@latest init`) | Component theme system | Brand theming via CSS vars |
| typescript | 5.x | Type safety | Locked by PRD |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint | bundled with Next.js 14 | Linting | Included by --eslint flag |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@neondatabase/serverless` | `@vercel/postgres` | `@vercel/postgres` is officially deprecated — do not use |
| character-based token estimate | tiktoken | tiktoken adds a WASM dependency; 4 chars/token estimate is sufficient for this chunk-size range |

### Installation

```bash
# Step 1: Scaffold Next.js app
NODE_TLS_REJECT_UNAUTHORIZED=0 npx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --yes

# Step 2: Add Neon + OpenAI dependencies
npm install @neondatabase/serverless openai

# Step 3: Init shadcn (theme only — no components)
NODE_TLS_REJECT_UNAUTHORIZED=0 npx shadcn@latest init
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── globals.css          # shadcn HSL overrides + Crowe semantic vars
│   ├── layout.tsx           # Root layout (html, body, font class)
│   └── page.tsx             # Minimal placeholder — "Crowe AI Assistant"
└── lib/
    ├── db.ts                # Neon sql client (POSTGRES_URL_NON_POOLING)
    ├── chunker.ts           # Heading-aware markdown chunker
    └── embeddings.ts        # OpenAI embeddings wrapper

scripts/                     # (Empty in Phase 2 — ingest.ts added in Phase 3)
tailwind.config.ts           # Crowe brand tokens
tsconfig.json                # Next.js 14 defaults
```

### Pattern 1: Neon Serverless SQL Client

**What:** Export a `sql` tagged template literal from `@neondatabase/serverless` connected via `POSTGRES_URL_NON_POOLING`.

**When to use:** All database access in this project. pgvector requires a non-pooled, session-level connection — the standard pooled `DATABASE_URL` (Pgbouncer) is incompatible.

**Example:**
```typescript
// src/lib/db.ts
// Source: https://neon.tech/docs/serverless/serverless-driver
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.POSTGRES_URL_NON_POOLING;
if (!connectionString) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is not set');
}

export const sql = neon(connectionString);
```

### Pattern 2: Database Migration via db.ts

**What:** Run `CREATE EXTENSION IF NOT EXISTS vector` and `CREATE TABLE IF NOT EXISTS doc_chunks` as a one-time setup step using the exported `sql` function.

**When to use:** Either as a standalone migration script or called once at startup. `IF NOT EXISTS` makes it idempotent.

**Example:**
```typescript
// scripts/migrate.ts (or inline in a setup script)
import { sql } from '../src/lib/db';

await sql`CREATE EXTENSION IF NOT EXISTS vector`;
await sql`
  CREATE TABLE IF NOT EXISTS doc_chunks (
    id          SERIAL PRIMARY KEY,
    doc_id      TEXT NOT NULL,
    doc_title   TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(1536),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )
`;
```

### Pattern 3: OpenAI Embeddings Wrapper

**What:** A single exported function that calls the OpenAI embeddings API and returns a flat `number[]`.

**When to use:** Called by ingest script (Phase 3) and chat API (Phase 4). Centralized so the model name and dimension are in one place.

**Example:**
```typescript
// src/lib/embeddings.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}
```

### Pattern 4: Heading-Aware Chunker

**What:** Split markdown on `## ` / `### ` headings, subdivide on `\n\n` if section exceeds MAX_CHUNK_CHARS, merge undersized sections with next sibling, prefix each chunk with the heading.

**When to use:** Called by `scripts/ingest.ts` (Phase 3) per document.

**Example:**
```typescript
// src/lib/chunker.ts
const MAX_CHUNK_CHARS = 2400;  // ~600 tokens
const MIN_CHUNK_CHARS = 400;   // ~100 tokens
const OVERLAP_CHARS = 200;     // ~50 tokens

export interface Chunk {
  docId: string;
  docTitle: string;
  chunkIndex: number;
  content: string;
}

export function chunkMarkdown(
  markdown: string,
  docId: string,
  docTitle: string,
): Chunk[] {
  // 1. Split on heading boundaries (## and ###)
  // 2. For sections exceeding MAX_CHUNK_CHARS, split further on \n\n
  // 3. Merge consecutive sections under MIN_CHUNK_CHARS with next sibling
  // 4. Prefix each chunk: "## Section Title\n\n[body]"
  // 5. Add OVERLAP_CHARS from end of previous chunk to start of next
  // Returns: Chunk[] with chunkIndex incrementing from 0
}
```

### Pattern 5: Tailwind Config with Crowe Brand Tokens

**What:** Extend the default Tailwind theme with Crowe color tokens, shadows, font families, and background utilities.

**Source of truth:** CLAUDE.md Section 2.2 — copy values exactly, do not paraphrase.

**Example (complete tailwind.config.ts extension):**
```typescript
// tailwind.config.ts — extend block (add to generated config)
// Source: CLAUDE.md Section 2.2
extend: {
  colors: {
    crowe: {
      amber: {
        bright: '#FFD231',
        DEFAULT: '#F5A800',
        dark: '#D7761D',
      },
      indigo: {
        bright: '#003F9F',
        DEFAULT: '#002E62',
        dark: '#011E41',
      },
      teal: { bright: '#16D9BC', DEFAULT: '#05AB8C', dark: '#0C7876' },
      cyan: { light: '#8FE1FF', DEFAULT: '#54C0E8', dark: '#007DA3' },
      blue: { light: '#32A8FD', DEFAULT: '#0075C9', dark: '#0050AD' },
      violet: { bright: '#EA80FF', DEFAULT: '#B14FC5', dark: '#612080' },
      coral: { bright: '#FF526F', DEFAULT: '#E5376B', dark: '#992A5C' },
    },
    tint: {
      950: '#1a1d2b',
      900: '#2d3142',
      700: '#545968',
      500: '#8b90a0',
      300: '#c8cbd6',
      200: '#dfe1e8',
      100: '#eef0f4',
      50:  '#f6f7fa',
    },
  },
  fontFamily: {
    display: ['Helvetica Now Display', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
    body:    ['Helvetica Now Text',    'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
    mono:    ['JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Consolas', 'monospace'],
  },
  boxShadow: {
    'crowe-sm':    '0 1px 3px rgba(1,30,65,0.06), 0 1px 2px rgba(1,30,65,0.04)',
    'crowe-md':    '0 4px 8px -2px rgba(1,30,65,0.06), 0 2px 4px -1px rgba(1,30,65,0.04)',
    'crowe-lg':    '0 6px 16px -4px rgba(1,30,65,0.07), 0 4px 6px -2px rgba(1,30,65,0.04)',
    'crowe-xl':    '0 12px 32px -8px rgba(1,30,65,0.08), 0 8px 16px -4px rgba(1,30,65,0.03)',
    'crowe-hover': '0 8px 24px -4px rgba(1,30,65,0.10), 0 4px 8px -2px rgba(1,30,65,0.04)',
    'crowe-card':  '0 1px 3px rgba(1,30,65,0.04), 0 6px 16px rgba(1,30,65,0.04), 0 12px 32px rgba(1,30,65,0.02)',
    'amber-glow':  '0 4px 16px rgba(245,168,0,0.20)',
  },
  backgroundColor: {
    page:           '#f8f9fc',
    section:        '#f6f7fa',
    'section-warm': '#f0f2f8',
    'section-amber':'#fff8eb',
  },
},
```

### Pattern 6: globals.css shadcn HSL Overrides

**What:** Override shadcn's default CSS variable values with Crowe brand HSL values. These vars drive ALL shadcn component colors automatically.

**Source of truth:** CLAUDE.md Section 4.2 — copy values exactly.

```css
/* src/app/globals.css — add AFTER @tailwind directives */
/* Source: CLAUDE.md Section 4.2 */
@layer base {
  :root {
    --background: 225 33% 98%;              /* #f8f9fc warm off-white */
    --foreground: 228 20% 22%;              /* #2d3142 warm dark */
    --card: 225 50% 99%;                    /* #fafbfd lifted card */
    --card-foreground: 228 20% 22%;
    --popover: 0 0% 100%;
    --popover-foreground: 228 20% 22%;
    --primary: 215 98% 13%;                 /* Crowe Indigo Dark */
    --primary-foreground: 225 33% 97%;
    --secondary: 39 100% 48%;               /* Crowe Amber */
    --secondary-foreground: 215 98% 13%;
    --muted: 225 20% 96%;                   /* #f0f2f8 indigo-wash */
    --muted-foreground: 228 10% 37%;        /* #545968 */
    --accent: 39 100% 48%;
    --accent-foreground: 215 98% 13%;
    --destructive: 341 79% 56%;             /* Crowe Coral */
    --destructive-foreground: 225 33% 97%;
    --border: 226 17% 89%;                  /* #dfe1e8 soft */
    --input: 226 17% 89%;
    --ring: 215 100% 19%;                   /* Crowe Indigo Core */
    --radius: 0.75rem;
  }
}
```

### Anti-Patterns to Avoid

- **`@vercel/postgres`:** Officially deprecated Q4 2024. `@neondatabase/serverless` is the replacement.
- **`DATABASE_URL` for db.ts:** This is the Pgbouncer-pooled URL. pgvector requires session-level connections — use `POSTGRES_URL_NON_POOLING`.
- **Pure black shadows:** Never `rgba(0,0,0,x)`. Always `rgba(1,30,65,x)` (indigo-tinted).
- **Pure white page background:** Never `#FFFFFF` as body bg. Use `#f8f9fc`.
- **Installing shadcn components in Phase 2:** `npx shadcn@latest init` only. Components (Button, Card, etc.) are Phase 5 work.
- **Creating IVFFlat index in schema migration:** Index must be created after data exists (Phase 3). An empty-table index is silently useless.
- **`NODE_TLS_REJECT_UNAUTHORIZED=0` in .env files:** Shell-prefix only. Never in `.env.local`, `.env`, or Vercel environment variables.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Postgres connection | Custom `pg.Pool` wrapper | `neon()` from `@neondatabase/serverless` | Handles HTTP/WebSocket transport for Vercel edge/serverless; pool setup is error-prone |
| OpenAI client config | Manual `fetch` to OpenAI API | `new OpenAI({ apiKey })` | SDK handles retries, type safety, error parsing |
| CSS variable theming | Custom CSS var naming scheme | shadcn init then override `--primary`, `--background` etc. | All shadcn components read from these vars; one change propagates everywhere |
| Token counting | Real tokenizer (tiktoken) | `Math.floor(text.length / 4)` estimate | tiktoken adds WASM binary; character estimate is accurate enough for 400-2400 char range |

**Key insight:** Every custom solution in this phase would be replaced later anyway — `neon()` and `new OpenAI()` are the standard patterns that Phase 3 and Phase 4 code will call. Get the patterns right here so downstream phases don't need to refactor.

---

## Common Pitfalls

### Pitfall 1: create-next-app overwrites existing files
**What goes wrong:** Running `create-next-app .` in a non-empty directory may prompt about existing files (README.md, .gitignore, etc.) and overwrite them.
**Why it happens:** create-next-app scaffolds its own .gitignore, README.md. The `--yes` flag accepts all prompts.
**How to avoid:** The `--yes` flag handles the interactive prompts. Verify CLAUDE.md, DESIGN.md, and docs/ are still intact after running. These are pre-existing and should not be overwritten (they are not Next.js scaffold files).
**Warning signs:** If docs/ or CLAUDE.md disappear — they won't; create-next-app only writes its own files.

### Pitfall 2: shadcn init on Crowe network requires SSL bypass
**What goes wrong:** `npx shadcn@latest init` makes HTTPS calls to the shadcn registry. The Crowe SSL proxy intercepts TLS, causing certificate errors.
**Why it happens:** Corporate SSL proxy (same as Vercel CLI issue).
**How to avoid:** Prefix with `NODE_TLS_REJECT_UNAUTHORIZED=0`. Keep this as a shell-only prefix — NOT in .env files.
**Warning signs:** `Error: unable to verify the first certificate` or `DEPTH_ZERO_SELF_SIGNED_CERT` during shadcn init.

### Pitfall 3: shadcn init prompts may conflict with manual globals.css edits
**What goes wrong:** `shadcn init` writes its own CSS variable block to globals.css. If globals.css already has content (from Tailwind), the init may produce duplicate `@layer base` blocks.
**Why it happens:** create-next-app generates a globals.css with Tailwind directives; shadcn then appends its own overrides.
**How to avoid:** Let shadcn init run first (it will write its default CSS vars), then replace the `--background`, `--primary`, etc. values with the Crowe HSL values from CLAUDE.md Section 4.2. Don't try to pre-populate globals.css before shadcn init runs.
**Warning signs:** Two `@layer base { :root {` blocks in globals.css.

### Pitfall 4: `POSTGRES_URL_NON_POOLING` vs `DATABASE_URL` confusion
**What goes wrong:** Using `DATABASE_URL` (pooled) for db.ts causes pgvector queries to fail at Phase 3/4 with obscure errors.
**Why it happens:** Vercel Postgres/Neon provides both a pooled URL (via Pgbouncer) and a direct/non-pooled URL. pgvector operations require a persistent session connection that Pgbouncer does not support.
**How to avoid:** `db.ts` must use `POSTGRES_URL_NON_POOLING`. The `.env.local` already has both vars set. Never swap them.
**Warning signs:** Phase 3 will fail with `prepared statement does not exist` or similar pgvector session errors if the wrong URL is used.

### Pitfall 5: tailwind.config.ts vs tailwind.config.js
**What goes wrong:** create-next-app with TypeScript generates `tailwind.config.ts`. If code is edited as `.js`, TypeScript strict checks don't apply and color tokens could be mistyped silently.
**Why it happens:** Some shadcn docs show `tailwind.config.js` examples.
**How to avoid:** Keep `tailwind.config.ts`. The Crowe token values from CLAUDE.md Section 2.2 can be copied directly as a TypeScript object.

### Pitfall 6: Importing lib/ modules before they compile
**What goes wrong:** TypeScript errors in `db.ts`, `chunker.ts`, or `embeddings.ts` will prevent `npm run dev` from succeeding (Next.js compile-time type-checking).
**Why it happens:** Any import of these files from page.tsx or layout.tsx triggers full type-checking.
**How to avoid:** The Phase 2 page.tsx is a minimal placeholder with NO imports from lib/. The lib files must be free of TypeScript errors before any app code imports them. Verify each file compiles standalone via `npx tsc --noEmit` before the final dev server test.

---

## Code Examples

### @neondatabase/serverless — sql tagged template usage
```typescript
// Source: https://neon.tech/docs/serverless/serverless-driver
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL_NON_POOLING!);

// Query example (used in Phase 3+)
const rows = await sql`SELECT * FROM doc_chunks LIMIT 5`;

// Parameterized query (safe from SQL injection)
const result = await sql`
  SELECT id, content FROM doc_chunks
  WHERE doc_id = ${docId}
  ORDER BY chunk_index
`;
```

### OpenAI embeddings.create() — single text
```typescript
// Source: https://platform.openai.com/docs/api-reference/embeddings
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
});
// response.data[0].embedding is number[] with 1536 elements
```

### OpenAI embeddings.create() — batch (used in Phase 3)
```typescript
// Batch all chunk texts in one API call — avoids Vercel timeout
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunks.map(c => c.content),  // string[]
});
// response.data[i].embedding maps to chunks[i]
```

### Minimal placeholder page.tsx
```tsx
// src/app/page.tsx — Phase 2 placeholder only
// Real UI in Phase 5
export default function Home() {
  return (
    <div className="min-h-screen bg-crowe-indigo-dark flex items-center justify-center">
      <h1 className="text-white text-2xl font-display">Crowe AI Assistant</h1>
    </div>
  );
}
```

### Chunker heading-split logic (outline)
```typescript
// src/lib/chunker.ts — structural outline
export function chunkMarkdown(markdown: string, docId: string, docTitle: string): Chunk[] {
  // 1. Split on /^(#{2,3} .+)$/m to extract headings
  const sections = splitOnHeadings(markdown);

  // 2. For each section: if length > MAX_CHUNK_CHARS, split on \n\n
  const rawChunks = sections.flatMap(section =>
    section.length > MAX_CHUNK_CHARS
      ? splitOnParagraphs(section, MAX_CHUNK_CHARS, OVERLAP_CHARS)
      : [section]
  );

  // 3. Merge consecutive chunks under MIN_CHUNK_CHARS with next sibling
  const mergedChunks = mergeSmallChunks(rawChunks, MIN_CHUNK_CHARS);

  // 4. Map to Chunk objects with heading prefix
  return mergedChunks.map((content, i) => ({
    docId,
    docTitle,
    chunkIndex: i,
    content,    // already prefixed: "## Heading\n\n[body]"
  }));
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/postgres` | `@neondatabase/serverless` | Q4 2024 | Old package still installs but is deprecated — don't use |
| `pages/` router | App Router (`app/`) | Next.js 13+ | CONTEXT.md locks App Router; no `pages/` directory |
| `npx shadcn-ui@latest` | `npx shadcn@latest` | shadcn 2024 rename | Old package name still works but generates deprecation warning |
| `next.config.js` | `next.config.ts` | Next.js 15+ convention | create-next-app may generate either; keep .ts for consistency |

**Deprecated/outdated:**
- `@vercel/postgres`: Deprecated Q4 2024. Replaced by `@neondatabase/serverless`.
- `npx create-next-app@13` or `@14`: Use `@latest` — locks to stable Next.js 14.x as of March 2026.
- `pages/_app.tsx` + `pages/_document.tsx`: Not used with App Router. Delete if create-next-app generates them (it should not with `--app`).

---

## Open Questions

1. **Does create-next-app generate `next.config.ts` or `next.config.js` on this machine?**
   - What we know: Recent Next.js versions generate `next.config.ts`. Older versions generate `.js`.
   - What's unclear: The exact version locked by `create-next-app@latest` on 2026-03-06.
   - Recommendation: Accept whichever is generated; rename to `.ts` only if needed for project consistency.

2. **Does `npx shadcn@latest init` ask about the CSS variables format (HSL vs RGB)?**
   - What we know: shadcn init has an interactive prompt about which style (default/new-york) and whether to use CSS variables.
   - What's unclear: Whether `--yes` skips all prompts or still asks.
   - Recommendation: If prompted, choose "default" style and "yes" to CSS variables. The overrides in CLAUDE.md Section 4.2 then replace the defaults.

3. **Migration script location — dedicated file or inline?**
   - What we know: CONTEXT.md says "run via `@neondatabase/serverless` in a migration script or directly in db.ts setup."
   - What's unclear: Whether to create a `scripts/migrate.ts` or embed the CREATE TABLE in db.ts as an auto-run.
   - Recommendation: Create `scripts/migrate.ts` — keeps db.ts clean and makes the migration explicit and re-runnable. Phase 3 will add more scripts here.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config present in project root |
| Config file | None — see Wave 0 gaps |
| Quick run command | `npx tsc --noEmit` (TypeScript compilation check) |
| Full suite command | `npm run build` (Next.js full build + type check) |

**Note:** This phase has no runtime behavior to unit test — it is pure scaffolding and utility functions. TypeScript compilation is the primary validation gate. The chunker is a pure function that can be manually smoke-tested during Phase 3 ingest development. Formal unit tests for chunker.ts are deferred to Phase 3 (where chunking quality is first observed against real data).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RAGG-01 | Next.js dev server starts | smoke | `npm run dev` (manual check: loads at localhost:3000) | ❌ Wave 0 |
| RAGG-02 | Brand tokens render correctly | smoke | `npm run dev` (manual: page shows indigo bg + white text) | ❌ Wave 0 |
| RAGG-03 | doc_chunks table created in Neon | manual | Check Neon console for table existence | N/A |
| RAGG-04 | db.ts exports sql without TS errors | type-check | `npx tsc --noEmit` | ❌ Wave 0 |
| RAGG-05 | chunker.ts compiles without TS errors | type-check | `npx tsc --noEmit` | ❌ Wave 0 |
| RAGG-06 | embeddings.ts compiles without TS errors | type-check | `npx tsc --noEmit` | ❌ Wave 0 |
| RAGG-07 | docs/01-08 exist with real content | manual | `ls docs/` (already verified — files present) | ✅ |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npm run build`
- **Phase gate:** `npm run dev` loads placeholder page with Crowe Indigo background + white text; `npx tsc --noEmit` exits 0

### Wave 0 Gaps
- [ ] `tsconfig.json` — generated by create-next-app (Wave 0 task: run create-next-app)
- [ ] `package.json` with `scripts.build` — generated by create-next-app
- [ ] No dedicated test files needed for this phase (TypeScript compile is sufficient gate)

*(No unit test files required — this phase is scaffolding only; TypeScript + manual dev server check covers all requirements)*

---

## Sources

### Primary (HIGH confidence)
- `CLAUDE.md` (project root) — Tailwind config tokens (Section 2.2), shadcn HSL overrides (Section 4.2), font families, shadow tokens. Copied verbatim.
- `02-CONTEXT.md` — All implementation decisions locked. Used as authoritative constraint source.
- [Neon Docs — Neon serverless driver](https://neon.tech/docs/serverless/serverless-driver) — `neon()` API, `sql` tagged template pattern, POSTGRES_URL_NON_POOLING usage
- [Neon Docs — Vercel Postgres Transition Guide](https://neon.com/docs/guides/vercel-postgres-transition-guide) — @vercel/postgres deprecation confirmed
- [OpenAI API — Embeddings](https://platform.openai.com/docs/api-reference/embeddings) — `embeddings.create()` API, `text-embedding-3-small` dimensions

### Secondary (MEDIUM confidence)
- [shadcn/ui docs — Installation](https://ui.shadcn.com/docs/installation/next) — `npx shadcn@latest init` flow, CSS variable mode, Next.js App Router integration
- [Next.js docs — Getting Started](https://nextjs.org/docs/getting-started/installation) — `create-next-app` flags, App Router defaults, `src/` directory

### Tertiary (LOW confidence — not needed, all decisions locked)
- N/A — all decisions are locked in CONTEXT.md; no exploratory research was required.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library choices locked in CONTEXT.md; @neondatabase/serverless deprecation of @vercel/postgres confirmed in project-level SUMMARY.md against official Neon docs
- Architecture: HIGH — project structure is standard Next.js 14 App Router; lib/ utility patterns are straightforward and fully specified
- Brand tokens: HIGH — copied verbatim from CLAUDE.md (authoritative source); no derivation or interpretation required
- Pitfalls: HIGH — each pitfall is grounded in known behavior (SSL proxy, pgvector pooling requirement, shadcn init behavior) documented in project-level research

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable stack; brand tokens don't change; Next.js 14 is stable)
