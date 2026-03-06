# Stack Research

**Domain:** RAG chat app (Next.js + pgvector + OpenAI) + local MCP server (Node.js/TypeScript stdio)
**Researched:** 2026-03-06
**Confidence:** MEDIUM — core versions verified via WebSearch against npm/GitHub release data; WebFetch blocked by Crowe SSL proxy

---

## Critical Context: Stack is Constrained by PROJECT.md

The following are non-negotiable per `PROJECT.md`:

- Next.js 14 App Router (not 15 or 16, even though 16 is current as of March 2026)
- TypeScript throughout
- Tailwind CSS + shadcn/ui
- OpenAI only — gpt-4o completions, text-embedding-3-small embeddings
- Vercel Postgres via Neon (pgvector) — schema: `doc_chunks`, ivfflat index, lists=100
- MCP StdioServerTransport only — no HTTP
- Windows-first MCP server (Git Bash + PowerShell)

Do not deviate from these constraints even when researching alternatives.

---

## Recommended Stack

### RAG App — Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 14.x (pin to 14) | App framework + API routes | Constrained by PROJECT.md; App Router is the correct paradigm for this |
| TypeScript | 5.x | Type safety throughout | Standard with Next.js 14 scaffolding |
| Tailwind CSS | 3.x | Utility-first styling | Bundled with Next.js 14 init, required by shadcn/ui |
| openai (npm) | ^6.27.0 | OpenAI API client — embeddings + completions | Latest stable as of March 2026; v6 API is largely compatible with v4 for embeddings.create() and chat.completions.create() |
| @neondatabase/serverless | latest (^0.x) | Postgres driver for Neon (pgvector host) | `@vercel/postgres` was deprecated Q4 2024; Neon is the direct successor; this driver is the official recommendation for new projects |
| zod | ^3.x | Schema validation for API route bodies | v4 released July 2025 but zod 3 remains widely used; verify compatibility with Next.js 14 before upgrading to v4 |

### RAG App — Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-markdown | ^9.x | Render LLM markdown responses in chat UI | Required for markdown output, code fences, lists in chat |
| rehype-highlight | ^7.x | Syntax highlighting in code blocks | Pair with react-markdown for code copy UI feature |
| highlight.js | ^11.x | Peer dep for rehype-highlight | Auto-installed as peer dep; pin to match rehype-highlight expectations |
| shadcn/ui (CLI) | latest | Pre-built accessible UI components | Used for Button, Card, Badge, Textarea — install only what's needed |
| lucide-react | ^0.x | Icon set bundled with shadcn/ui | Use for send icon, copy icon, loading spinner |
| clsx | ^2.x | Conditional className utility | Used internally by shadcn; import directly for custom conditionals |
| tailwind-merge | ^2.x | Merge Tailwind classes without conflicts | Required by shadcn/ui utilities (cn()) |

### MCP Server — Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @modelcontextprotocol/sdk | ^1.27.1 | MCP protocol implementation | Latest v1.x stable as of March 2026; v2 is pre-alpha/not production-ready |
| TypeScript | 5.x | Type safety, compiled to JS | Standard; required for tool schema definitions with Zod |
| zod | ^3.x | Tool input schema validation | Required by MCP SDK for defining tool parameter schemas |
| tsx | ^4.x | Run TypeScript directly in development | Preferred over ts-node for ESM support; zero-config; works cleanly on Windows |

### MCP Server — Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| glob | ^10.x | Recursive file discovery for asset bundling | Use in bundled assets mode to enumerate markdown docs |
| minimatch | ^9.x | Pattern matching for search_docs keyword filter | Lighter alternative to glob for string matching |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsx | Run TypeScript dev server without compile step | `npx tsx src/index.ts` — replaces ts-node; no ESM config gymnastics |
| tsc | Compile TypeScript to JS for production dist | Target: ES2022, module: NodeNext, moduleResolution: NodeNext |
| MCP Inspector | Interactive tool testing before VSCode integration | `npx @modelcontextprotocol/inspector` — connects via stdio to your server |
| shadcn CLI | Add UI components individually | `npx shadcn@latest add button` — never installs unused components |

---

## Installation

### RAG App (crowe-ai-onboarding)

```bash
# On Crowe network — required prefix for all npm/npx commands
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install

# Core runtime
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install openai @neondatabase/serverless zod react-markdown rehype-highlight highlight.js clsx tailwind-merge lucide-react

# shadcn/ui init (interactive — picks Tailwind config, adds cn() utility)
NODE_TLS_REJECT_UNAUTHORIZED=0 npx shadcn@latest init

# Add only the shadcn components needed
NODE_TLS_REJECT_UNAUTHORIZED=0 npx shadcn@latest add button badge card textarea

# Dev dependencies
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install -D typescript @types/node @types/react @types/react-dom
```

### MCP Server (crowe-mcp-server)

```bash
# On Crowe network
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install @modelcontextprotocol/sdk zod glob

# Dev dependencies
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install -D typescript tsx @types/node

# package.json must include:
# "type": "module"
# "main": "dist/index.js"
# scripts: { "build": "tsc", "dev": "tsx src/index.ts", "start": "node dist/index.js" }
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| @neondatabase/serverless | @vercel/postgres | Officially deprecated Q4 2024; Vercel stopped maintaining it; all Vercel Postgres stores migrated to Neon |
| @neondatabase/serverless | @neondatabase/vercel-postgres-compat | Compat layer is for migrating existing codebases, not new projects; adds unnecessary abstraction |
| openai v6 | ai (Vercel AI SDK) | PROJECT.md constrains to OpenAI only; Vercel AI SDK adds abstraction that obscures direct embeddings.create() calls; no benefit for this use case |
| react-markdown + rehype-highlight | MDX | MDX requires build-time compilation; runtime markdown rendering is correct for LLM chat output |
| tsx | ts-node | ts-node requires complex ESM config on Node 18+; tsx works with zero config on Windows; faster |
| @modelcontextprotocol/sdk v1.x | v2.x (pre-alpha) | v2 is in pre-alpha as of March 2026; not stable; official guidance is to stay on v1.x for production |
| zod v3 | zod v4 | zod v4 released July 2025 but MCP SDK peer deps and community patterns still primarily reference v3; verify compatibility before upgrading |
| Next.js 14 | Next.js 15 or 16 | PROJECT.md hard constraint; Next.js 16 is current but migration is out of scope |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @vercel/postgres | Officially deprecated; Vercel stopped maintaining it; not available for new Vercel Postgres stores | @neondatabase/serverless |
| langchain / @langchain/openai | Heavy abstraction layer for a simple RAG use case; adds 200+ deps; makes debugging harder | Call openai SDK directly for embeddings and completions |
| Prisma ORM | Adds schema migration complexity for a single-table use case; prisma generate step complicates Vercel cold starts | Raw SQL via @neondatabase/serverless neon\`\` tagged template |
| Drizzle ORM | Lighter than Prisma but still unnecessary for a single doc_chunks table | Raw SQL via @neondatabase/serverless |
| console.log() in MCP server | Writes to stdout, corrupts JSON-RPC messages between MCP host and server | Use console.error() (writes to stderr) or write to a log file |
| http/SSE transport for MCP | Out of scope; PROJECT.md requires stdio only; Copilot spawns the process directly | StdioServerTransport only |
| openai v4 or v5 | Outdated; v6.27.0 is current stable as of March 2026 | openai ^6.x |
| text-embedding-ada-002 | Older model; text-embedding-3-small is faster, cheaper, and higher quality at the same 1536 dimensions | text-embedding-3-small |

---

## Stack Patterns by Variant

**RAG ingestion pipeline (`npm run ingest`):**
- Run as a standalone Node.js script (not a Next.js API route)
- Use `@neondatabase/serverless` with `neon()` for HTTP-mode single queries (no WebSocket needed)
- Chunk markdown with custom splitter (no LangChain text splitter needed)
- Call `openai.embeddings.create({ model: "text-embedding-3-small", input: chunk })` per chunk
- INSERT with `embedding::vector` cast in raw SQL
- Protect the `/api/ingest` endpoint with `INGEST_SECRET` header check

**Chat API route (`/api/chat`):**
- Next.js 14 App Router Route Handler (`app/api/chat/route.ts`)
- Single `POST` handler — no streaming (PROJECT.md out-of-scope)
- Query embedding → cosine similarity search → top-5 chunks → gpt-4o completion
- Return `{ answer: string, sources: string[] }` JSON

**MCP server tool pattern:**
- Use `McpServer` (high-level API), not low-level `Server` class
- Register tools with `server.tool(name, description, zodSchema, handler)`
- Import `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js` (note `.js` extension — ESM NodeNext requirement)
- `await server.connect(transport)` as the last line of main()
- Export nothing — MCP server is a process, not a module

**Windows `.vscode/mcp.json` pattern:**
```json
{
  "servers": {
    "crowe-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": {
        "ASSETS_PATH": "${workspaceFolder}/assets"
      }
    }
  }
}
```
Use `node dist/index.js` (compiled), not `tsx src/index.ts`, in the mcp.json — VSCode spawns the process cold and tsx adds startup latency on Windows. Ship the compiled dist.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| openai ^6.x | Node.js >= 18 | v6 dropped Node 16 support; Vercel uses Node 18+ by default |
| @modelcontextprotocol/sdk ^1.27.1 | Node.js >= 18, TypeScript >= 5.0 | v1.x is stable; v2 pre-alpha is on main branch but not published as stable |
| @neondatabase/serverless | Next.js 14 App Router, Edge Runtime, Node.js Runtime | HTTP mode works in Edge; WebSocket mode requires Node.js runtime |
| Next.js 14 | React 18 | Next.js 14 uses React 18; do not install React 19 |
| shadcn/ui (latest CLI) | Next.js 14 App Router + Tailwind 3 | shadcn CLI supports Next.js 14; init detects Tailwind version automatically |
| zod ^3.x | @modelcontextprotocol/sdk ^1.x | MCP SDK types reference Zod 3 internally; use v3 to avoid type conflicts |
| rehype-highlight ^7.x | react-markdown ^9.x | Both are ESM; ensure Next.js 14 transpilePackages includes both if import errors occur |

---

## Vercel + Neon Postgres Setup Specifics

1. Add Neon integration via Vercel Marketplace (not the old Vercel Storage tab)
2. The integration auto-populates these env vars: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PGHOST`, `PGUSER`, `PGDATABASE`, `PGPASSWORD`
3. Use `DATABASE_URL` (pooled connection) for API routes; use `DATABASE_URL_UNPOOLED` for the ingest script (direct connection, supports DDL)
4. Enable pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`
5. Schema for this project:
   ```sql
   CREATE TABLE IF NOT EXISTS doc_chunks (
     id SERIAL PRIMARY KEY,
     source TEXT NOT NULL,
     content TEXT NOT NULL,
     embedding vector(1536)
   );
   CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx
     ON doc_chunks USING ivfflat (embedding vector_cosine_ops)
     WITH (lists = 100);
   ```
6. Cosine similarity query pattern:
   ```sql
   SELECT source, content, 1 - (embedding <=> $1::vector) AS similarity
   FROM doc_chunks
   ORDER BY embedding <=> $1::vector
   LIMIT 5;
   ```
   Filter: `WHERE 1 - (embedding <=> $1::vector) >= 0.3`

---

## Windows-Specific Considerations for MCP Server

- Always prefix npm install with `NODE_TLS_REJECT_UNAUTHORIZED=0` on Crowe network
- In `.vscode/mcp.json`, use `node dist/index.js` (compiled) not `tsx` — avoids tsx startup time on Windows and removes dev dep from runtime
- Build step: `npm run build` (runs `tsc`) before committing dist/ — include dist/ in the repo so new hires don't need to build
- Path separators: use `path.join()` not string concatenation; Node.js on Windows handles forward slashes but `__dirname` patterns with `import.meta.url` need `fileURLToPath()` for ESM
- `console.error()` is the only safe logging channel in the MCP server process — VSCode reads stdout as JSON-RPC; any non-JSON on stdout will break tool invocation silently
- Test with MCP Inspector before pushing: `npx @modelcontextprotocol/inspector node dist/index.js`

---

## Sources

- [npmjs.com — @modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk): version 1.27.1 latest as of March 2026 (MEDIUM confidence — WebSearch result, npm page returned 403)
- [GitHub — modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk): v2 is pre-alpha on main branch; v1.x is production recommendation (MEDIUM confidence — WebSearch)
- [npmjs.com — openai](https://www.npmjs.com/package/openai): version 6.27.0 latest as of March 2026 (MEDIUM confidence — WebSearch result)
- [Neon Docs — Vercel Postgres Transition Guide](https://neon.com/docs/guides/vercel-postgres-transition-guide): @vercel/postgres deprecated; @neondatabase/serverless for new projects (HIGH confidence — official docs via WebSearch)
- [Neon Docs — pgvector extension](https://neon.com/docs/extensions/pgvector): ivfflat index setup, 1536 dimensions (HIGH confidence — official docs via WebSearch)
- [Neon Docs — Vercel Integration](https://neon.com/docs/guides/vercel-managed-integration): env var names (DATABASE_URL, DATABASE_URL_UNPOOLED) (HIGH confidence — official docs)
- [MCP official docs — Build a server](https://modelcontextprotocol.io/docs/develop/build-server): StdioServerTransport, console.error() requirement (HIGH confidence — official spec docs)
- [OpenAI API — text-embedding-3-small](https://platform.openai.com/docs/models/text-embedding-3-small): 1536 dimensions default, embeddings.create() API (HIGH confidence — official OpenAI docs)
- [Zod releases](https://github.com/colinhacks/zod/releases): v4.3.6 latest; v3.x still widely used (MEDIUM confidence — WebSearch)
- [tsx vs ts-node comparison](https://betterstack.com/community/guides/scaling-nodejs/tsx-vs-ts-node/): tsx preferred for ESM/Windows (MEDIUM confidence — WebSearch)
- [VSCode MCP server docs](https://code.visualstudio.com/docs/copilot/customization/mcp-servers): .vscode/mcp.json schema and stdio configuration (HIGH confidence — official Microsoft docs)

---

*Stack research for: Crowe AI Onboarding — RAG App + MCP Server*
*Researched: 2026-03-06*
