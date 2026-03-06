# Workflow Guide — How We Build

How tasks are structured, how AI coding tools fit in, and how to stay productive across multi-session projects.

---

## The GSD Framework

GSD (Get Shit Done) is the task management approach used across all builds. It enforces a strict cycle that prevents the most common failure modes when working with AI coding agents: scope creep, lost context, and compounding errors.

The four stages:

```
DISCUSS   → Clarify what needs to be built. Define acceptance criteria.
            Don't write code yet. Don't plan in code.

PLAN      → Produce a task plan. One task = one atomic unit of work.
            Define inputs, outputs, file paths, acceptance criteria.
            Get the plan reviewed before executing.

EXECUTE   → One task at a time. Fresh context window per task ideally.
            The agent reads the plan, executes, stops.

VERIFY    → Test the output against the acceptance criteria.
            Fix before moving to the next task.
            Do not batch tasks and verify at the end.
```

**Why this matters with AI agents:** An agent given a vague instruction accumulates errors across 10 steps that are hard to unpick. An agent given a precise single task with clear acceptance criteria either succeeds cleanly or fails visibly at step 1.

---

## CLAUDE.md and DESIGN.md

Every project has a `CLAUDE.md` at the root. Every session, the agent reads this first. It contains:
- The project name, repo, and production URL
- Stack decisions and deviations from defaults
- The data layer spec for that project
- Component naming conventions
- Any project-specific rules

There's also a master `CLAUDE.md` in the VS Code Programming Projects root that applies to all projects. It contains the full tech stack, Crowe brand design system, deployment procedures, and git workflow.

When you start a new project, copy the master CLAUDE.md, then add a project-specific section at the bottom (`## PROJECT: project-name`). This is the "brain" of the project that persists across sessions.

**DESIGN.md** (or `.claude/rules/frontend-design.md`) is the visual companion — it contains all the Crowe color tokens, typography rules, shadow values, and animation patterns. Some projects store this inline in CLAUDE.md, others keep it separate. Either way, every agent session references it.

**The rule:** If it's not in CLAUDE.md or DESIGN.md, the agent doesn't know it. Don't rely on the agent remembering things from a previous session. Write it down.

---

## Working with GitHub Copilot

Copilot is your primary coding assistant in VSCode. A few things that make it substantially more useful:

**Be specific about context.** Copilot works from what's in your open files. Before asking it to generate a component, have the data file it needs to render open in the editor. Have CLAUDE.md open. The more relevant context is visible, the better the output.

**Use Copilot Chat for planning, inline completion for execution.** Open Copilot Chat (`Ctrl+Shift+I`) for: "How should I structure this component?", "What's the right Tailwind class for this?", "Explain what this function does." Use inline completion (Tab) for: completing a function signature, generating a similar block to one you just wrote.

**With the MCP server running:** If you've set up the Crowe MCP server (see the MCP setup guide), Copilot Chat has access to your CLAUDE.md, DESIGN.md, and all project docs as callable tools. You can ask: "What background color should I use for a card?" and Copilot will call `get_branding_standards` and return the exact token. This eliminates the need to switch to docs while coding.

**Be directive, not conversational.** "Create a TypeScript interface for a model validation finding with these fields: id, severity, description, status, dueDate" produces better output than "can you help me with a type for findings?"

**Iterate in small steps.** Ask for one function, check it, then ask for the next. Don't ask for an entire component in one shot — the output degrades significantly as complexity increases.

---

## Starting a New Project

1. **Read the PRD or brief first.** Understand what you're building before touching code. If there's no PRD, write one before starting.

2. **Run the init command:**
   ```bash
   npx create-next-app@latest [name] --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   cd [name]
   NODE_TLS_REJECT_UNAUTHORIZED=0 npx shadcn@latest init
   ```

3. **Copy and configure CLAUDE.md.** Copy from the root VS Code Programming Projects folder. Fill in the project-specific section.

4. **Set up the data layer first.** Before any components, create `src/data/` and write out your data types and mock data. This forces you to think about what the app actually needs to render.

5. **Build backend before frontend.** If the app has API routes, get those working and tested with a tool like Thunder Client (VSCode extension) before building the UI.

6. **Apply Crowe brand tokens before building any UI.** Add the Tailwind config extensions, the shadcn CSS variable overrides, and the globals.css brand tokens. An hour of brand setup at the start saves hours of retrofitting at the end.

---

## Managing Context Across Sessions

AI agents don't remember previous sessions. CLAUDE.md is how you give them memory.

**After each significant build session, update CLAUDE.md with:**
- What was built (brief summary)
- Any architectural decisions that weren't in the original spec
- Any deviations from the standard patterns and why
- What's next / what's in progress

**If a task is interrupted mid-way:** Leave a comment in the relevant file:
```typescript
// TODO: [date] — in progress, need to wire this to the API route
// Expected shape: { answer: string, sources: string[] }
```

The next session, the agent reads this and knows where to pick up.

---

## Commit Conventions

Use Conventional Commits — it makes the git log readable and enables automatic changelog generation if needed:

```
feat: add export to DOCX functionality
fix: correct date formatting in finding timeline
docs: update CLAUDE.md with data layer spec
style: apply amber glow to CTA buttons
refactor: move scenario data to /data layer
test: add unit tests for risk tiering rules engine
chore: bump dependencies, fix Vercel build warning
```

Small, frequent commits. Don't accumulate a day's work in one commit. Commit when a feature or fix is complete and tested, even if it's 10 times a day.

---

## Pre-Demo Checklist

Before showing any tool to a client or in a workshop:

- [ ] `npm run build` passes locally — no TypeScript errors
- [ ] Production URL loads in under 2 seconds
- [ ] All AI responses are pre-computed or the API is confirmed working
- [ ] Test every interactive element once end-to-end
- [ ] Check on the screen resolution you'll be presenting from (often 1440px or projected at 1080p)
- [ ] Have a fallback — a screenshot or recorded demo — if the live tool breaks
- [ ] Close unrelated browser tabs and terminals before the demo

The most reliable demos are the ones where nothing is live-computed. Pre-populate state, pre-load data, pre-run AI calls and cache the results. Demo the UX — not the latency.

---

## Useful VSCode Settings

Add these to your VSCode `settings.json` (`Ctrl+Shift+P` → "Open User Settings JSON"):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "terminal.integrated.defaultProfile.windows": "Git Bash"
}
```

These configure Prettier for auto-formatting, set Git Bash as the default terminal, and enable full Tailwind class autocomplete including `cva` and `cx` patterns.

---

## When Something Breaks in Production

1. Check the Vercel deployment logs first: https://vercel.com/achyuth-rachurs-projects/[project]/deployments
2. Look at the Function Logs tab for server-side errors (API route errors, OpenAI failures)
3. Check the browser console on the production URL for client-side errors
4. If it's a TypeScript error, run `npm run build` locally — it'll show the same error with a better stack trace
5. Fix locally, verify with `npm run build`, then push

For OpenAI errors specifically: check that the `OPENAI_API_KEY` environment variable is set in Vercel (not just in your local `.env.local`). Environment variables set locally do not automatically sync to Vercel — you must add them via `vercel env add` or the dashboard.
