# Feature Research

**Domain:** RAG onboarding chat app + MCP server (internal developer tooling)
**Researched:** 2026-03-06
**Confidence:** MEDIUM (WebSearch verified against official MCP docs and GitHub Copilot docs)

---

## Part 1: RAG Chat App (crowe-ai-onboarding)

### Table Stakes (Users Expect These)

Features a new hire assumes exist. Missing these makes the product feel broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Natural language Q&A | Core product promise — type a question, get an answer | LOW | gpt-4o + pgvector retrieval already planned |
| Source citations on every answer | Users trained by ChatGPT and Copilot to distrust unsourced AI answers; citation accuracy in RAG averages 65-70% without explicit attribution training | MEDIUM | Show as chips/pills below the answer; include doc name + chunk reference |
| "I don't have information on that" fallback | Without a hard refusal path, the model hallucinates; threshold-based gating is standard practice | LOW | 0.3 cosine similarity threshold already decided in PROJECT.md — must surface this to users, not silently fail |
| Session message history | Users need to follow up on previous answers within the same session | LOW | Client-side state only (already scoped out of PROJECT.md for server-side) |
| Starter / suggested prompts on empty state | New hires don't know what to ask; research shows blank input boxes cause first-time failure without guidance | LOW | 4 curated prompts already planned; label them as real questions, not abstract categories |
| Markdown rendering in answers | Answers from gpt-4o contain headers, bullet lists, and code blocks; rendering as raw markdown text is a broken experience | LOW | next/markdown or react-markdown; code blocks need copy button |
| Code block copy button | Developers copy commands constantly; no copy button = friction on every code snippet | LOW | Standard in every dev-facing AI tool (ChatGPT, Copilot, etc.) |
| Responsive layout (375px+) | New hires may check from mobile during orientation | LOW | Tailwind responsive classes; already in requirements (Lighthouse >= 90) |
| Loading / in-progress state | LLM calls take 2-5 seconds; no feedback = users assume the page is broken | LOW | Skeleton or typing indicator during fetch |
| Error state with recovery | Network failures, API rate limits, and ingestion gaps all produce errors; user needs a clear message and retry path | LOW | Toast or inline error message with "Try again" |

### Differentiators (Competitive Advantage)

Features that set this product apart for new Crowe AI practice hires. Not assumed, but high-value for the target audience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Crowe-branded UI (Indigo Dark + Amber) | Signals this is an official Crowe tool, not a generic chatbot; builds trust from day one | LOW | Already specified in DESIGN.md — Indigo Dark #011E41 top bar, Amber #F5A800 CTAs |
| Domain-scoped answers (practice-only) | Generic AI tools give generic answers; this one answers only from Crowe AI practice docs, which makes answers authoritative and correct for the context | MEDIUM | System prompt + similarity threshold enforces scope; cite which doc answered |
| Source chip with document name | Users can self-validate: click the chip, know exactly which internal doc backs the answer | MEDIUM | Requires storing doc name metadata alongside embeddings in pgvector |
| 4 curated starter prompts that reflect real onboarding gaps | Guides new hires to the highest-value questions immediately; replaces the "where do I even start?" problem | LOW | Must be maintained as knowledge base evolves; treat as living content |
| Graceful out-of-scope message | "I don't have information on that in the Crowe AI practice docs" is more trustworthy than a hallucinated answer; builds credibility over time | LOW | Already decided (0.3 threshold) — make the message warm, not robotic |
| Ingestion-ready architecture (re-ingest when docs change) | Knowledge base stays current; a stale onboarding tool is worse than no tool | MEDIUM | Manual `npm run ingest` already planned; consider a `/api/ingest` route with INGEST_SECRET protection (already specified) |

### Anti-Features (Deliberately Not Built)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| User authentication / login | "Secure the app for Crowe employees only" | Crowe SSO requires Active Directory access not available outside corporate domain; adds weeks of complexity for an internal tool with no sensitive data | Public URL access is fine; knowledge base is non-sensitive internal docs |
| Real-time streaming responses | "Makes it feel faster and more like ChatGPT" | Adds SSE/WebSocket complexity, complicates error handling, difficult on Vercel edge with pgvector; benefit is cosmetic for ~3 second responses | Static request/response with a clear loading state achieves the same perceived quality |
| Persistent cross-session conversation history | "So users can pick up where they left off" | Requires a user identity system (see above); without auth, there's no session to resume; server-side state without auth creates GDPR/privacy surface | Client-side session state (already decided); new hires re-orient quickly with starter prompts |
| Conversation memory (multi-turn context injection) | "So follow-up questions work" | Injecting full conversation history into every retrieval call degrades retrieval precision — the retrieved chunks drift from the actual current question | Re-phrase follow-ups as self-contained questions; starter prompts model this |
| Admin UI for knowledge base editing | "So HR/team leads can update docs without a developer" | Scope creep; the knowledge base is 8 markdown docs in a repo — git is the right editor for structured technical content | Markdown docs in repo + `npm run ingest` after each update |
| Confidence score display | "Show the user how confident the AI is" | Users misinterpret numeric confidence scores; scores near threshold are unstable and create more questions than answers | Show sources (which is the real confidence signal); show "I don't have info" below threshold |
| Feedback / thumbs up-down on answers | "So we can improve the model" | Collecting feedback without a pipeline to act on it is misleading to users; requires analytics infra and a feedback loop to be useful | Log failed retrievals (below-threshold queries) to identify knowledge gaps |

---

## Part 2: MCP Server (crowe-mcp-server)

### Table Stakes (Users Expect These)

A developer-facing MCP server must meet the standard set by the GitHub MCP Server and similar tools the target users already use.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Tools discoverable by Copilot agent mode | The entire value is Copilot calling the tools; if tools are not discovered, the server is invisible | LOW | Tool names and descriptions are the orchestration signal — Copilot reads them to decide when to call each tool |
| Clear, imperative tool descriptions | Copilot agent mode uses tool descriptions to decide when to invoke a tool; vague descriptions = tool never gets called | LOW | Microsoft guidance: descriptions are effectively instructions to the orchestrator; be specific about what the tool does and when to use it |
| Structured tool inputs with schema validation | Copilot passes typed arguments to tools; unvalidated inputs cause runtime failures the user can't debug | MEDIUM | Zod validation already a best practice; each tool input needs type + description |
| Graceful error responses (not crashes) | If a tool throws an unhandled error, Copilot's agent loop stalls; developers expect errors as data, not exceptions | LOW | Return `{ error: "message", tool: "tool_name" }` — never let stdio transport crash |
| Works on Windows (Git Bash + PowerShell) | Target users are on Crowe Windows machines with no admin rights | MEDIUM | Path resolution, line endings, and stdio encoding are common failure points on Windows; explicit testing needed |
| Pre-configured .vscode/mcp.json | Developers expect clone-and-go; requiring manual config file creation adds friction to setup | LOW | Already planned; include `${input:variableName}` pattern for any env vars |
| 5-minute setup README | MCP servers require Node.js, clone, and config — this must be documented for a developer who has never heard of MCP | LOW | Already planned; include troubleshooting for Crowe SSL proxy issues |
| Bundled assets (clone-and-go) | If assets require an external path to work, every Windows path difference breaks the setup | LOW | Already decided in PROJECT.md; assets ship with the repo |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Full-coverage tool set (10 tools across all Crowe assets) | A partial tool set means Copilot can answer some questions but not others — inconsistency erodes trust | MEDIUM | Already planned: search_docs, list_projects, get_project_readme, plus per-asset tools |
| `search_docs` as the universal entry point | One tool that searches all docs lets Copilot find answers without knowing which specific doc to query | MEDIUM | Keyword search across all 8 markdown docs; returns matched doc name + excerpt |
| Per-asset tools for structured access | Structured tools (list_projects, get_project_readme) return clean data that Copilot can reference directly, unlike full-text search results | LOW | Project registry: 7 projects with README access; maps 1:1 to available assets |
| Live mode via ASSETS_PATH env var | Allows the tool to pick up updated docs without requiring a new clone; useful once the knowledge base grows | LOW | Already planned; optional override of bundled assets path |
| Copilot-friendly tool naming (verb_noun pattern) | Tools named `search_docs`, `list_projects`, `get_project_readme` follow the verb-noun MCP convention and match how Copilot's orchestrator pattern-matches tool intent | LOW | Kebab-case for package name, snake_case for tool names is the MCP ecosystem standard |
| SSL proxy workaround documented | Crowe's corporate SSL proxy breaks npm install and node execution without `NODE_TLS_REJECT_UNAUTHORIZED=0`; documenting this in setup saves each new hire 30+ minutes of debugging | LOW | Must be in setup README; make it step 1, not a footnote |

### Anti-Features (Deliberately Not Built)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| HTTP/SSE transport | "More flexible for future remote access" | Requires network port, firewall rules, and auth on Crowe machines; stdio is simpler, faster, and already supported by VSCode + Copilot | stdio transport is the right choice for local developer tools; HTTP can be added in a future version |
| Semantic/embedding-based search in MCP | "More accurate than keyword search" | Requires OpenAI API call per query at tool invocation time, adding latency and API cost; also requires embedding infra running locally | Keyword search is fast, deterministic, and sufficient for 8 well-structured docs; leave semantic search to the RAG app |
| Tool auto-discovery from live filesystem | "Dynamically add tools as new docs are added" | Dynamic tool lists are unstable — Copilot caches tool lists and unexpected tool additions break agent mode sessions | Fixed 10-tool set; update the server when new assets are added; version the server |
| Copilot Studio / Microsoft Teams integration | "Expose this to the whole firm" | Requires Microsoft 365 admin credentials, app registration, and enterprise MCP server (HTTP not stdio); completely different product | This server is VSCode + Copilot only; a Teams bot is a separate project |
| Authentication on MCP tools | "Restrict to authorized users" | stdio transport is local-only by design; the only user is the developer who cloned the repo; auth adds complexity with zero security benefit | Local stdio inherently scopes access to the machine owner |

---

## Feature Dependencies

```
RAG Chat App
    Knowledge base ingestion (embeddings + pgvector)
        └──required by──> Chat API (retrieval)
                              └──required by──> Source citations
                              └──required by──> Fallback threshold behavior
                              └──required by──> Chat UI (Q&A)
                                                    └──enhanced by──> Starter prompts
                                                    └──enhanced by──> Markdown rendering
                                                        └──required by──> Code copy button
                                                    └──enhanced by──> Loading state
                                                    └──enhanced by──> Error state

MCP Server
    Bundled assets (docs + project registry)
        └──required by──> search_docs tool
        └──required by──> list_projects tool
        └──required by──> get_project_readme tool
        └──required by──> All other per-asset tools

    Tool schema (Zod validation + descriptions)
        └──required by──> Copilot tool discovery
        └──required by──> Graceful error responses

    .vscode/mcp.json
        └──required by──> Copilot agent mode registration
```

### Dependency Notes

- **Chat API requires ingestion:** You cannot build or test the chat UI until embeddings are in pgvector. Ingestion pipeline is the critical path blocker for the RAG app.
- **Source citations require doc name metadata:** The pgvector schema must store the source document name alongside each chunk. This is a schema-level decision, not a UI decision — add it at ingestion time, not retroactively.
- **Fallback behavior requires threshold enforcement in the API:** The 0.3 cosine similarity threshold must be enforced in the API route, not the UI. The UI just displays what the API returns.
- **MCP tool discovery requires descriptions before implementation:** Write tool descriptions before writing tool logic. The description determines whether Copilot calls the tool at all.
- **Windows compatibility requires testing on the target platform:** All MCP server features depend on Windows Git Bash + PowerShell compatibility. Cannot verify from dev environment alone.

---

## MVP Definition

### Launch With (v1) — RAG App

- [ ] Ingestion pipeline (chunking + embedding + pgvector store) — without this nothing else works
- [ ] Chat API with cosine similarity retrieval (top-5 chunks, 0.3 threshold) — core product function
- [ ] Source citation chips on every answer — non-negotiable trust signal
- [ ] "I don't have information on that" fallback below threshold — prevents hallucination
- [ ] Chat UI with Crowe branding, starter prompts, markdown rendering, code copy — complete user experience
- [ ] Loading state and error state — required for a production-quality UI
- [ ] Vercel deployment with completed ingestion — product is only useful when live

### Launch With (v1) — MCP Server

- [ ] All 10 tools implemented with Zod-validated inputs and graceful error handling — all or nothing; a partial tool set confuses Copilot's routing
- [ ] Bundled assets (docs + project registry in repo) — clone-and-go is the core UX promise
- [ ] Pre-configured .vscode/mcp.json — required for Copilot to discover the server
- [ ] Windows-tested execution (Git Bash + PowerShell) — target platform; untested = broken
- [ ] Setup README with SSL proxy workaround — without this, new hires cannot install dependencies

### Add After Validation (v1.x)

- [ ] Live mode (ASSETS_PATH env var) — add when the knowledge base grows beyond 8 docs and manual re-cloning becomes friction
- [ ] Updated starter prompts when knowledge base evolves — treat as content maintenance, not a feature
- [ ] Logging of below-threshold queries — add when you want to identify knowledge gaps; requires a log aggregation approach

### Future Consideration (v2+)

- [ ] Streaming responses in RAG app — only worthwhile if response latency exceeds 5 seconds consistently; adds transport complexity
- [ ] Feedback / thumbs up-down — only worthwhile with a feedback pipeline and model evaluation loop; don't collect data you won't act on
- [ ] Admin UI for knowledge base editing — only worthwhile if non-developer team members need to update docs; RAG over fine-tuning already enables instant updates via re-ingest

---

## Feature Prioritization Matrix

### RAG App

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Ingestion pipeline | HIGH | MEDIUM | P1 |
| Chat API (retrieval + generation) | HIGH | MEDIUM | P1 |
| Source citations | HIGH | LOW | P1 |
| Fallback below threshold | HIGH | LOW | P1 |
| Chat UI (Crowe branded) | HIGH | MEDIUM | P1 |
| Starter prompts | HIGH | LOW | P1 |
| Markdown rendering + code copy | MEDIUM | LOW | P1 |
| Loading / error states | MEDIUM | LOW | P1 |
| Live ingestion route (/api/ingest) | MEDIUM | LOW | P1 |
| Logging of failed queries | LOW | LOW | P3 |
| Streaming responses | LOW | HIGH | P3 |

### MCP Server

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| search_docs tool | HIGH | MEDIUM | P1 |
| list_projects tool | HIGH | LOW | P1 |
| get_project_readme tool | HIGH | LOW | P1 |
| Per-asset tools (7 remaining) | HIGH | LOW | P1 |
| Bundled assets mode | HIGH | LOW | P1 |
| .vscode/mcp.json config | HIGH | LOW | P1 |
| Zod validation on all tools | HIGH | LOW | P1 |
| Windows compatibility (Git Bash + PS) | HIGH | MEDIUM | P1 |
| Setup README with SSL workaround | HIGH | LOW | P1 |
| Live mode (ASSETS_PATH) | MEDIUM | LOW | P2 |
| HTTP transport | LOW | HIGH | P3 |

---

## Competitor Feature Analysis

These are the tools new Crowe AI practice hires will compare this against, consciously or not.

| Feature | ChatGPT / GPT-4o (baseline) | GitHub Copilot Chat (dev baseline) | Crowe AI Onboarding (our approach) |
|---------|----|----|-----|
| Source grounding | No (hallucination risk) | Partial (codebase context) | Yes — 8 Crowe AI practice docs, cited per answer |
| Domain scoping | No — answers anything | No — answers anything | Yes — hard scoping to Crowe docs only |
| Out-of-scope refusal | Rarely | Rarely | Yes — explicit fallback at 0.3 threshold |
| Starter prompts | Yes (4 cards in ChatGPT) | No | Yes — 4 curated prompts for Crowe context |
| Brand / visual identity | Generic | GitHub/VS Code | Crowe Indigo Dark + Amber |
| MCP tool access | No | Via MCP servers | Via crowe-mcp-server |
| Knowledge freshness | Training cutoff | Codebase only | Manual re-ingest (fast, controlled) |
| Setup friction for new hire | Zero (web browser) | Medium (Copilot license) | RAG app: zero; MCP server: ~5 minutes |

---

## Sources

- GitHub Docs — Enhancing GitHub Copilot agent mode with MCP: https://docs.github.com/en/copilot/tutorials/enhance-agent-mode-with-mcp
- GitHub Docs — Extending Copilot Chat with MCP servers: https://docs.github.com/copilot/customizing-copilot/using-model-context-protocol/extending-copilot-chat-with-mcp
- Microsoft Learn — Extend your agent with MCP (Copilot Studio): https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp
- VS Code Docs — Add and manage MCP servers: https://code.visualstudio.com/docs/copilot/customization/mcp-servers
- MCP Architecture Overview: https://modelcontextprotocol.io/docs/learn/architecture
- MCP Transport Future (2025): http://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/
- Buzzi.ai — AI Document Retrieval RAG: Citations and Confidence: https://www.buzzi.ai/insights/ai-document-retrieval-rag-citation-architecture
- CustomGPT — AI Guardrails: Prevent LLM Hallucinations with RAG: https://customgpt.ai/ai-guardrails-how-to-prevent-llm-hallucinations/
- Langwatch — The Ultimate RAG Blueprint 2025/2026: https://langwatch.ai/blog/the-ultimate-rag-blueprint-everything-you-need-to-know-about-rag-in-2025-2026
- Agentive AI — 7 Best Onboarding Chatbots for Internal IT Support 2025: https://agentiveaiq.com/listicles/7-best-onboarding-chatbots-for-internal-it-support
- Mobbin — Empty State UI Pattern best practices: https://mobbin.com/glossary/empty-state
- ZazenCodes — MCP Server Naming Conventions: https://zazencodes.com/blog/mcp-server-naming-conventions

---

*Feature research for: RAG onboarding chat app + MCP server (Crowe AI practice)*
*Researched: 2026-03-06*
