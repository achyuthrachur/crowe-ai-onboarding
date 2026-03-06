# PRD: Crowe AI Onboarding System
### Two repos: `crowe-ai-onboarding` (RAG) + `crowe-mcp-server` (MCP)
### Stack: Next.js 14 · TypeScript · Tailwind · shadcn/ui · OpenAI · Vercel
### AI Runtime: OpenAI only (gpt-4o, text-embedding-3-small)
### Author: Achyuth Rachur | Last Updated: March 2026

---

## Project Identity

| Field | RAG App | MCP Server |
|-------|---------|------------|
| **Repo** | `achyuthrachur/crowe-ai-onboarding` | `achyuthrachur/crowe-mcp-server` |
| **Deploy** | Vercel (`crowe-ai-onboarding.vercel.app`) | Local only (localhost:3001) |
| **Purpose** | Browser-based knowledge base chat | VSCode/Copilot context provider |
| **Users** | New hires — browser, any device | New hires — active VSCode sessions |

---

## Agent Instructions — Read Before Writing Any Code

> **This section is mandatory. Do not skip it.**

Before writing a single line of code, the coding agent must read the following two files in full:

1. **`CLAUDE.md`** — located at the project root (copied from the master at `C:\Users\RachurA\OneDrive - Crowe LLP\VS Code Programming Projects\CLAUDE.md`). This file contains the universal coding standards, Crowe brand design system, tech stack decisions, deployment procedures, git workflow, and all component and animation library conventions. Every decision not explicitly covered in this PRD defaults to what is specified in CLAUDE.md.

2. **`DESIGN.md`** — located at the project root (copied from the master at `C:\Users\RachurA\OneDrive - Crowe LLP\VS Code Programming Projects\DESIGN.md`). This file is the visual design system reference: Crowe color tokens, typography rules, shadow values, surface treatments, animation timing, and anti-patterns. Any UI work — component styling, layout, color choices, shadows, spacing — must be cross-referenced against DESIGN.md before implementation.

**Conflict resolution:** If this PRD and CLAUDE.md/DESIGN.md disagree, this PRD wins on product-specific decisions (what to build, how data flows, API shapes, component names). CLAUDE.md/DESIGN.md win on code standards and visual design (how to write TypeScript, which shadow token to use, how to structure a component).

**If CLAUDE.md or DESIGN.md are not present in the project root:** Do not proceed. Ask for them or copy them from the master VS Code Programming Projects folder before starting.

---

## Constraints (Read First)

- **OpenAI only.** No Anthropic API. Uses `OPENAI_API_KEY` throughout.
- **Model:** `gpt-4o` for completions, `text-embedding-3-small` for embeddings.
- **No Crowe corporate domain.** Vercel URL only for RAG app. MCP is local.
- **New hire toolchain:** ChatGPT, GitHub Copilot (Codex), GitHub, VSCode. No Cursor, no Claude Code.
- **Windows target.** The MCP server must run cleanly on Windows (Git Bash / PowerShell).
- **Crowe network SSL proxy.** All npm/git commands may need `NODE_TLS_REJECT_UNAUTHORIZED=0`. Document this explicitly in every setup guide.
- **No admin rights on Crowe machines.** All installs must be user-scope.
- **Crowe brand on the RAG UI.** Crowe Indigo Dark `#011E41`, Crowe Amber `#F5A800`, warm off-white `#f8f9fc` page background, soft indigo-tinted shadows.

---

## Repo 1: `crowe-ai-onboarding` (RAG App)

### What It Is

A Next.js web app with three capabilities:
1. A chat interface where users ask questions and get answers grounded in Crowe AI docs
2. An admin ingestion route that processes markdown docs into vector embeddings
3. A Vercel Postgres (pgvector) database storing the embedded knowledge base

### Project Structure

```
crowe-ai-onboarding/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Chat UI (full page, single route)
│   │   ├── layout.tsx
│   │   ├── globals.css                 # Crowe brand tokens
│   │   └── api/
│   │       ├── chat/route.ts           # POST — RAG query endpoint
│   │       └── ingest/route.ts         # POST — doc ingestion endpoint
│   ├── components/
│   │   ├── ChatInterface.tsx           # Main chat UI component
│   │   ├── Message.tsx                 # Individual message bubble
│   │   ├── SourceCitation.tsx          # Shows which doc the answer came from
│   │   └── ui/                         # shadcn components
│   └── lib/
│       ├── embeddings.ts               # OpenAI embedding helpers
│       ├── retrieval.ts                # Vector search logic (pgvector)
│       ├── chunker.ts                  # Markdown -> chunks
│       └── db.ts                       # Vercel Postgres client
├── docs/                               # Knowledge base source files (markdown)
│   ├── 00-PRD.md                       # This file — the build specification
│   ├── 01-getting-started.md
│   ├── 02-stack-overview.md
│   ├── 03-ui-libraries.md
│   ├── 04-branding-guide.md
│   ├── 05-vercel-deployment.md
│   ├── 06-project-patterns.md
│   ├── 07-workflow-guide.md
│   └── 08-resources.md
├── scripts/
│   └── ingest.ts                       # CLI: npm run ingest
├── .env.example
├── .env.local                          # gitignored
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── CLAUDE.md                           # Copied from master + project-specific section
└── DESIGN.md                           # Copied from master
```

---

## Phase 1 — RAG App: Database + Ingestion Pipeline

**Goal:** Vercel Postgres set up with pgvector, ingestion script processes markdown docs into embeddings, data persists in the DB. Nothing visible to users yet.

### 1.1 Environment Setup

```bash
# .env.example — copy to .env.local
OPENAI_API_KEY=                    # Required: OpenAI key
POSTGRES_URL=                      # From Vercel Postgres (auto-injected after linking)
POSTGRES_URL_NON_POOLING=          # From Vercel Postgres
NEXT_PUBLIC_APP_NAME=Crowe AI Assistant
INGEST_SECRET=                     # Any random string — protects /api/ingest
```

### 1.2 Database Schema

Run once via migration or direct SQL in Vercel Postgres console:

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

CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx
  ON doc_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 1.3 Chunking Strategy (`src/lib/chunker.ts`)

- Split markdown by `##` heading boundaries first
- If a section exceeds 800 tokens, split further at paragraph breaks
- Minimum chunk size: 100 tokens (merge short sections with next sibling)
- Each chunk carries: `docId`, `docTitle`, `chunkIndex`, `content`
- Preserve heading as prefix: `"## UI Libraries Guide — When to Use Anime.js\n\n[body text]"`

### 1.4 Embeddings (`src/lib/embeddings.ts`)

```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunkText,
});
return response.data[0].embedding; // number[]
```

### 1.5 Ingestion Script (`scripts/ingest.ts`)

```
1. Read all .md files from /docs (skip 00-PRD.md)
2. For each file:
   a. Extract docId (filename without extension), docTitle (first H1)
   b. Chunk with chunker.ts
   c. Generate embedding for each chunk via OpenAI
   d. Delete existing rows for this docId (idempotent)
   e. Insert new rows
3. Log: "Ingested X chunks from Y documents"
```

```json
"scripts": {
  "ingest": "npx ts-node --project tsconfig.json scripts/ingest.ts"
}
```

### 1.6 Ingestion API Route (`src/app/api/ingest/route.ts`)

```
POST /api/ingest
Headers: { "x-ingest-secret": process.env.INGEST_SECRET }
Body: { "docId"?: string }
Response: { "ingested": number, "docs": string[] }
```

### Phase 1 Deliverables Checklist

- [ ] Next.js project initialized with TypeScript, Tailwind, shadcn
- [ ] CLAUDE.md and DESIGN.md present at project root
- [ ] Crowe brand tokens in `globals.css` per DESIGN.md
- [ ] Vercel Postgres created and linked
- [ ] pgvector extension enabled, schema migrated
- [ ] `src/lib/db.ts`, `chunker.ts`, `embeddings.ts` implemented
- [ ] `scripts/ingest.ts` and `/api/ingest/route.ts` implemented
- [ ] `docs/` folder with 8 stub markdown files
- [ ] `npm run ingest` populates database
- [ ] Rows present with non-null embeddings (verify in Vercel Postgres console)

---

## Phase 2 — RAG App: Retrieval + Chat API

**Goal:** Working backend — takes a question, retrieves relevant chunks, returns a GPT-4o answer with source citations.

### 2.1 Retrieval (`src/lib/retrieval.ts`)

```typescript
export async function retrieveChunks(query: string, topK = 5) {
  const queryEmbedding = await embedText(query);
  const result = await sql`
    SELECT doc_id, doc_title, chunk_index, content,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM doc_chunks
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${topK}
  `;
  return result.rows;
}
```

Minimum similarity threshold: `0.3` — below this, return "I don't have information on that in the knowledge base."

### 2.2 Chat API Route (`src/app/api/chat/route.ts`)

```
POST /api/chat
Body: { message: string, history: { role, content }[] }
Response: { answer: string, sources: { docId, docTitle, similarity }[] }
```

System prompt template:
```
You are the Crowe AI Practice onboarding assistant. You help new team members
understand the tools, stack, branding standards, and workflows used on the team.

Answer questions using ONLY the context provided below. If the context doesn't
contain enough information to answer confidently, say so clearly.

When referencing specific values (colors, class names, commands), quote them
exactly as they appear in the context.

Context:
---
{retrieved_chunks_joined_with_separator}
---
```

Settings: `model: "gpt-4o"`, `max_tokens: 800`, `temperature: 0.2`, `stream: false`

### Phase 2 Deliverables Checklist

- [ ] `src/lib/retrieval.ts` — vector search with 0.3 similarity threshold
- [ ] `/api/chat/route.ts` — full RAG chain (embed → retrieve → complete)
- [ ] Source citations returned with each response
- [ ] Manual test: "what colors does Crowe use?" returns indigo/amber from branding doc with source citation

---

## Phase 3 — RAG App: Chat UI

**Goal:** Polished, Crowe-branded chat interface. All styling references DESIGN.md.

### 3.1 Layout

```
┌─────────────────────────────────────────────────────┐
│  TOP BAR: Crowe logo + "AI Practice Assistant"      │  h-14, bg #011E41
├─────────────────────────────────────────────────────┤
│  MESSAGES AREA (scrollable)                         │  flex-1, overflow-y-auto
│  USER bubble — right-aligned, amber accent          │
│  ASSISTANT bubble — left-aligned, white card        │
│    Markdown-rendered answer                         │
│    Sources: [03-ui-libraries] [04-branding-guide]   │
├─────────────────────────────────────────────────────┤
│  INPUT BAR: textarea + send button                  │  h-20
└─────────────────────────────────────────────────────┘
```

### 3.2 Components

**`ChatInterface.tsx`** — message state, API call, auto-scroll, loading skeleton. 4 starter chips when empty: "How do I start a new Next.js project?", "What UI library should I use for animations?", "What are the Crowe brand colors?", "How do I deploy to Vercel?"

**`Message.tsx`** — user: right-aligned pill `bg-crowe-amber/10 border-crowe-amber/20`. Assistant: left-aligned white card, soft shadow. Markdown via `react-markdown` + `remark-gfm`. Code blocks with copy button.

**`SourceCitation.tsx`** — compact chips `[04-branding-guide]` below assistant messages, expand on hover/click to show full title.

### 3.3 Brand Rules (cross-reference DESIGN.md for all values)

- Page background: `#f8f9fc` — never pure white
- Top bar: `#011E41`
- Card shadows: `rgba(1,30,65,X)` — never `rgba(0,0,0,X)`
- Send button: `bg-crowe-amber` with amber glow hover
- Input focus ring: `ring-crowe-amber`

### Phase 3 Deliverables Checklist

- [ ] `ChatInterface.tsx` with all states (empty, loading, messages)
- [ ] `Message.tsx` — markdown + copy button on code blocks
- [ ] `SourceCitation.tsx` — expandable chips
- [ ] Crowe brand applied per DESIGN.md throughout
- [ ] Responsive: 375px mobile through desktop
- [ ] `npm run build` passes with zero TypeScript errors

---

## Phase 4 — RAG App: Deployment + Docs Content

### 4.1 Deployment

```bash
git init && git add . && git commit -m "feat: initial crowe-ai-onboarding"
GH="/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe"
"$GH" repo create achyuthrachur/crowe-ai-onboarding --public --source=. --remote=origin --push
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project crowe-ai-onboarding
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel postgres create crowe-ai-onboarding-db
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes
# Enable pgvector + run schema SQL via Vercel Postgres console
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel deploy --prod --yes
```

### 4.2 Knowledge Base Docs

The 8 docs in `/docs/` are written by Achyuth (not the coding agent). The coding agent creates stubs in Phase 1. The real content is already written — see the existing files in the docs folder.

The ingest script skips `00-PRD.md` — only files `01-` through `08-` are ingested into the vector database.

### 4.3 Post-Deploy Ingestion

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run ingest
```

### Phase 4 Deliverables Checklist

- [ ] Repo at `achyuthrachur/crowe-ai-onboarding`
- [ ] Production URL resolves
- [ ] Vercel Postgres linked, pgvector enabled, schema migrated
- [ ] `npm run ingest` run against production DB
- [ ] 3 test questions all return grounded answers with sources
- [ ] Lighthouse performance ≥ 90
- [ ] Mobile layout verified

---

---

## Repo 2: `crowe-mcp-server` (MCP Server)

### What It Is

A local Node.js/TypeScript server implementing the Model Context Protocol. Runs on the new hire's Windows machine. Plugs into VSCode + GitHub Copilot Chat. Exposes Crowe AI practice assets as callable tools.

### Project Structure

```
crowe-mcp-server/
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── branding.ts
│   │   ├── conventions.ts
│   │   ├── stack.ts
│   │   ├── deployment.ts
│   │   ├── projects.ts
│   │   ├── search.ts
│   │   ├── resources.ts
│   │   └── workflow.ts
│   └── lib/
│       ├── fileReader.ts
│       └── search.ts
├── assets/
│   ├── CLAUDE.md
│   ├── DESIGN.md
│   ├── getting-started.md
│   ├── stack-overview.md
│   ├── ui-libraries.md
│   ├── branding-guide.md
│   ├── vercel-deployment.md
│   ├── project-patterns.md
│   ├── workflow-guide.md
│   ├── resources.md
│   └── project-registry.json
├── .vscode/
│   └── mcp.json
├── .env.example
├── package.json
├── tsconfig.json
├── CLAUDE.md
├── DESIGN.md
└── README.md
```

### Dual-Mode Design

**Bundled (default):** Assets in `/assets`. Clone and go. `git pull` to update.

**Live (Achyuth's machine):** Set `ASSETS_PATH` env var to VS Code Programming Projects path. Reads live files from disk directly.

---

## Phase 5 — MCP Server: Core Tools

**Goal:** Server running locally, all 10 tools implemented, VSCode integration working.

### 5.1 Setup

```bash
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node ts-node
```

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'crowe-ai-practice', version: '1.0.0' },
  { capabilities: { tools: {} } }
);
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allTools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await handleToolCall(request.params.name, request.params.arguments);
});
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 5.2 Tool Inventory

| Tool | Source | Description |
|------|--------|-------------|
| `get_branding_standards` | `DESIGN.md` | Color tokens, typography, shadows, anti-patterns |
| `get_project_conventions` | `CLAUDE.md` | TypeScript style, React patterns, file naming, git |
| `get_stack_reference` | `stack-overview.md` | Default stack, library decision tree |
| `get_deployment_guide` | `vercel-deployment.md` | Vercel setup, SSL workarounds, gh CLI |
| `get_ui_library_guide` | `ui-libraries.md` | shadcn vs React Bits vs 21st.dev vs Anime.js |
| `get_workflow_guide` | `workflow-guide.md` | GSD framework, Copilot tips, task patterns |
| `get_resource_links` | `resources.md` | All canonical URLs |
| `list_projects` | `project-registry.json` | All projects with descriptions |
| `get_project_readme` | Registry / live disk | README for a named project |
| `search_docs` | All assets | Keyword search, top 5 matching sections |

Tool descriptions must be written with precision — Copilot uses them to decide when to call each tool. Reference DESIGN.md when writing descriptions for brand-related tools so token names are accurate.

### 5.3 `fileReader.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_ASSETS = path.join(__dirname, '..', 'assets');
const ASSETS_PATH = process.env.ASSETS_PATH ?? BUNDLED_ASSETS;

export function readAsset(filename: string): string {
  const filePath = path.join(ASSETS_PATH, filename);
  if (!fs.existsSync(filePath)) {
    const bundledPath = path.join(BUNDLED_ASSETS, filename);
    if (fs.existsSync(bundledPath)) return fs.readFileSync(bundledPath, 'utf-8');
    return `Asset not found: ${filename}`;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

export function listAssets(): string[] {
  const dir = fs.existsSync(ASSETS_PATH) ? ASSETS_PATH : BUNDLED_ASSETS;
  return fs.readdirSync(dir).filter(f => f.endsWith('.md'));
}
```

### 5.4 `search_docs` Keyword Search

```typescript
export function searchDocs(query: string, topK = 5) {
  const terms = query.toLowerCase().split(' ').filter(t => t.length > 3);
  const results: { file: string; section: string; score: number }[] = [];
  for (const asset of listAssets()) {
    const content = readAsset(asset);
    const sections = content.split(/\n##+ /);
    for (const section of sections) {
      const lower = section.toLowerCase();
      const score = terms.reduce((acc, term) =>
        acc + (lower.match(new RegExp(term, 'g')) || []).length, 0);
      if (score > 0) results.push({ file: asset, section: section.slice(0, 600), score });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}
```

### 5.5 VSCode Config (`.vscode/mcp.json`)

```json
{
  "servers": {
    "crowe-ai-practice": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": { "ASSETS_PATH": "" }
    }
  }
}
```

### 5.6 `package.json`

```json
{
  "name": "crowe-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node --esm src/index.ts"
  },
  "dependencies": { "@modelcontextprotocol/sdk": "^1.0.0" },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.0.0"
  }
}
```

### Phase 5 Deliverables Checklist

- [ ] CLAUDE.md and DESIGN.md present at project root
- [ ] Server bootstrapped with stdio transport
- [ ] All 10 tools implemented with precise `description` fields
- [ ] `fileReader.ts` with dual-mode path resolution
- [ ] `search_docs` keyword search working
- [ ] `assets/` folder with CLAUDE.md, DESIGN.md, all 8 docs
- [ ] `.vscode/mcp.json` pre-configured
- [ ] `npm run build && npm start` runs cleanly on Windows
- [ ] VSCode test: "what background color should I use?" → Copilot calls `get_branding_standards` → returns `#f8f9fc`
- [ ] `README.md` with step-by-step Windows setup instructions

---

## Phase 6 — MCP Server: Project Registry + Live Mode

### 6.1 Project Registry (`assets/project-registry.json`)

```json
[
  {
    "name": "crowe-regulatory-assistant",
    "description": "RAG-style document chat for regulatory exam prep. 3-panel layout: prompts, document viewer, chat.",
    "stack": ["Next.js", "OpenAI", "Vercel"],
    "repo": "https://github.com/achyuthrachur/crowe-regulatory-assistant",
    "url": "https://crowe-regulatory-assistant.vercel.app"
  },
  {
    "name": "model-intake-agent",
    "description": "AI-guided model intake interview that populates a structured MRM form and generates documentation reports.",
    "stack": ["Next.js", "OpenAI", "Supabase", "Vercel"],
    "repo": "https://github.com/achyuthrachur/model-intake-agent"
  },
  {
    "name": "model-intake-risk-tiering",
    "description": "Full AI governance workflow: intake wizard, rules-engine risk tiering, validation lifecycle, findings tracking.",
    "stack": ["Next.js", "OpenAI", "Prisma", "PostgreSQL", "Vercel"],
    "repo": "https://github.com/achyuthrachur/model-intake-risk-tiering"
  },
  {
    "name": "wire-anomaly-detection",
    "description": "ML scoring pipeline for detecting anomalous wire transfers. Threshold and review-rate flagging modes.",
    "stack": ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Vercel"],
    "repo": "https://github.com/achyuthrachur/wire-anomaly-detection"
  },
  {
    "name": "alm-insight-suite",
    "description": "Multi-section ALM dashboard: scenarios, backtesting, liquidity, hedges, macro assumptions.",
    "stack": ["Next.js", "TypeScript", "Tailwind", "Vercel"],
    "repo": "https://github.com/achyuthrachur/alm-insight-suite"
  },
  {
    "name": "ai-close-demo",
    "description": "AI-assisted financial close workflow covering AP invoices, journal entries, and chart of accounts.",
    "stack": ["Next.js", "TypeScript", "Tailwind", "Vercel"],
    "repo": "https://github.com/achyuthrachur/ai-close-demo"
  },
  {
    "name": "crowe-ai-onboarding",
    "description": "RAG-based onboarding assistant — knowledge base for the Crowe AI practice stack and workflow.",
    "stack": ["Next.js", "OpenAI", "Vercel Postgres", "pgvector", "Vercel"],
    "repo": "https://github.com/achyuthrachur/crowe-ai-onboarding"
  }
]
```

### Phase 6 Deliverables Checklist

- [ ] `assets/project-registry.json` with all 7 projects
- [ ] `list_projects` returns formatted project list
- [ ] `get_project_readme` works in bundled and live mode
- [ ] `.env.example` documents `ASSETS_PATH` with explanation
- [ ] README updated with live-mode setup instructions

---

## Phase 7 — Polish + New Hire README

### 7.1 `crowe-mcp-server` README Structure

```
# Crowe AI Practice — MCP Server
## What This Does
## Prerequisites
## Setup — 5 Minutes
  ### Step 1: Clone and Install
  ### Step 2: Configure Environment
  ### Step 3: Build and Start
  ### Step 4: Connect to VSCode
## Testing It Works (3 sample questions)
## Keeping It Updated
## Live Mode — Advanced
## Tools Reference
```

### 7.2 `crowe-ai-onboarding` README Structure

```
# Crowe AI Practice — Onboarding Assistant
## Using the App
## Updating the Knowledge Base
## Local Development
## Adding New Docs
```

### 7.3 Final QA

**RAG App:** build passes · ingest runs · URL < 2s · 4 starters work · sources display · mobile 375px · Lighthouse ≥ 90 · no console errors

**MCP Server:** build + start on clean Windows · all 10 tools non-empty · Copilot picks up tools · live mode works · README tested end-to-end

---

## CLAUDE.md Project Sections

**For `crowe-ai-onboarding`:**
```markdown
## PROJECT: crowe-ai-onboarding
- RAG app: OpenAI text-embedding-3-small + gpt-4o
- Knowledge base docs in /docs (01- through 08-) — edit, then npm run ingest
- 00-PRD.md in /docs is excluded from ingestion
- Vercel Postgres + pgvector — connection via @vercel/postgres
- OpenAI only — never add Anthropic API dependencies
- temperature: 0.2, topK: 5, similarity threshold: 0.3
- INGEST_SECRET protects /api/ingest route
```

**For `crowe-mcp-server`:**
```markdown
## PROJECT: crowe-mcp-server
- Local MCP server, Node.js + TypeScript, no web framework
- @modelcontextprotocol/sdk with StdioServerTransport
- Bundled assets in /assets — update and commit when docs change
- Live mode via ASSETS_PATH env var pointing to VS Code Programming Projects
- No database, no API calls — pure file reading + keyword search
- Must work on Windows (Git Bash and PowerShell both)
- ESM modules — package.json "type": "module"
- Build output: /dist — always npm run build before testing
```

---

## Kickoff Prompts for Coding Agent

**For `crowe-ai-onboarding` — Phase 1:**
```
Before doing anything else, read CLAUDE.md and DESIGN.md in full.
These files define all coding standards, brand tokens, component conventions,
and design rules that apply to this project. Do not write any code until both
files have been read. If either file is missing from the project root, stop
and ask before proceeding.

Once CLAUDE.md and DESIGN.md are read:
Read this PRD in full.
Start with Phase 1 only — database and ingestion pipeline.
Initialize Next.js 14 App Router with TypeScript, Tailwind, and shadcn.
Apply Crowe brand tokens to globals.css using the token values from DESIGN.md.
Set up Vercel Postgres connection and run the schema SQL.
Implement: src/lib/db.ts, src/lib/chunker.ts, src/lib/embeddings.ts,
scripts/ingest.ts, and src/app/api/ingest/route.ts.
Create docs/ folder with 8 stub markdown files (placeholder content only —
the real content already exists and will be dropped in manually).
Verify npm run ingest runs successfully and populates the database.
Do not start Phase 2 until all Phase 1 checklist items are confirmed.
```

**For `crowe-mcp-server` — Phase 5:**
```
Before doing anything else, read CLAUDE.md and DESIGN.md in full.
Even though this is a local Node.js server with no UI, CLAUDE.md contains
the TypeScript conventions, file naming rules, git workflow, and code standards
that apply. DESIGN.md contains the brand reference used to write accurate
description strings for each MCP tool. Do not write any code until both files
have been read. If either file is missing, stop and ask before proceeding.

Once CLAUDE.md and DESIGN.md are read:
Read this PRD in full.
Start with Phase 5 only — core tools.
Initialize Node.js + TypeScript project with ESM modules.
Install @modelcontextprotocol/sdk.
Implement all 10 tools using bundled assets in /assets.
When writing tool description strings, reference DESIGN.md for accurate
color token names, shadow values, and anti-pattern descriptions.
Implement src/lib/fileReader.ts with dual-mode path resolution.
Implement src/lib/search.ts keyword search.
Pre-configure .vscode/mcp.json.
Verify npm run build && npm start runs on Windows without errors.
Test that tool responses are non-empty.
Do not start Phase 6 until all Phase 5 checklist items are confirmed.
```

---

## Out of Scope

- Authentication / login
- Real-time streaming
- Server-side conversation history
- Multi-user isolation
- Mobile app
- Automated ingestion on doc change
- Fine-tuning
- Crowe SSO / Active Directory
- Any Anthropic/Claude API usage (OpenAI only throughout)
