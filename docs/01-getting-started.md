# Getting Started on the Crowe AI Practice

Welcome to the team. This doc covers everything you need to go from zero to running your first project locally. Work through it in order.

---

## What You Need Installed

### Node.js
Install Node.js 20 LTS from https://nodejs.org. Choose the Windows installer. During install, check the box that says "Add to PATH". Verify after:
```
node -v   # should show v20.x.x
npm -v    # should show 10.x.x
```

### Git
Git is likely already installed on your Crowe machine. Verify with `git --version`. If not, download from https://git-scm.com/download/win — use the default settings.

### GitHub CLI (gh)
The `gh` CLI is already installed on the team machines at:
```
C:\Users\RachurA\AppData\Local\gh-cli\bin\gh.exe
```
Your credentials are stored in Windows Credential Manager. Test it by opening Git Bash and running:
```bash
"/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe" auth status
```

If you're on your own machine, download from https://cli.github.com and authenticate with `gh auth login`.

### Vercel CLI
```bash
npm install -g vercel
```
If you're on the Crowe network and hit SSL errors, prefix with:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install -g vercel
```
This is a known issue with the Crowe SSL inspection proxy — you'll need this prefix on most npm commands run on the corporate network.

### VSCode Extensions
Install these from the VSCode Extensions sidebar:
- **GitHub Copilot** — your primary AI coding assistant
- **GitHub Copilot Chat** — Copilot in the sidebar panel
- **ESLint** — catches TypeScript/React errors as you type
- **Prettier** — auto-formats code on save
- **Tailwind CSS IntelliSense** — autocompletes Tailwind class names
- **Prisma** — syntax highlighting if you work with database schema files

### Git Bash
Use Git Bash as your terminal inside VSCode. Set it as the default: `Ctrl+Shift+P` → "Terminal: Select Default Profile" → "Git Bash".

---

## Network Notes (Crowe Corporate)

The Crowe network runs an SSL inspection proxy. This breaks npm, git, and Vercel CLI in specific ways. Rules to follow:

**For npm installs on the Crowe network:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install
```

**For Vercel CLI commands:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel deploy --prod --yes
```

**For git operations:** Git usually works fine. If you hit certificate errors, run:
```bash
git config --global http.sslVerify false
```

You do not have admin rights on Crowe machines. All package installs go to user scope automatically — this is fine and expected.

---

## Your GitHub Setup

All projects live under the `achyuthrachur` GitHub account at https://github.com/achyuthrachur. You'll be added as a collaborator on the repos you're working on.

To clone a project:
```bash
git clone https://github.com/achyuthrachur/[project-name]
cd [project-name]
npm install
```

If npm install fails with SSL errors on the Crowe network:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install
```

---

## Running Your First Project Locally

Start with `crowe-regulatory-assistant` — it's the simplest codebase and a good introduction to the stack.

```bash
git clone https://github.com/achyuthrachur/crowe-regulatory-assistant
cd crowe-regulatory-assistant
npm install
```

Copy the environment file:
```bash
cp .env.example .env.local
```

Open `.env.local` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-...
```

Get your key from https://platform.openai.com/api-keys. If you don't have an account, ask Achyuth — the team has a shared key for internal tools.

Start the dev server:
```bash
npm run dev
```

Open http://localhost:3000. You should see the Regulatory Assistant with the Crowe Indigo dark nav and three-panel layout. If you see that, you're set up correctly.

---

## The Project Folder

All active projects live in OneDrive:
```
C:\Users\RachurA\OneDrive - Crowe LLP\VS Code Programming Projects\
```

Open this folder in VSCode with `File > Open Folder`. You'll see all the projects listed. Each one is its own git repo — you can open any of them individually or work from the root folder.

Key files to look for in every project:
- `CLAUDE.md` — coding conventions, stack decisions, project-specific rules
- `DESIGN.md` or `.claude/rules/frontend-design.md` — brand design system
- `.env.example` — the environment variables you need to add to `.env.local`
- `README.md` — what the project is and how to run it

---

## Accounts You Need

| Account | URL | Notes |
|---------|-----|-------|
| GitHub | https://github.com | Ask Achyuth to add you as collaborator |
| OpenAI | https://platform.openai.com | For API keys — ask for team access |
| Vercel | https://vercel.com | For deployments — ask Achyuth to add you to the team |

You don't need accounts for shadcn, React Bits, 21st.dev, or Anime.js — those are all accessed via npm or copy-paste from their docs.

---

## Your First Week

**Day 1:** Get the environment set up, run crowe-regulatory-assistant locally. Read the CLAUDE.md and DESIGN.md in the root VS Code Programming Projects folder. Don't skip this — those two files contain everything about how code is written and how the UI looks.

**Day 2–3:** Browse the other projects. Look at how `alm-insight-suite`, `wire-anomaly-detection`, and `model-intake-risk-tiering` are structured. Notice the `/src/data` folder in each — that's where all content and config lives, separate from components.

**Day 4–5:** Try building a small feature or component in one of the projects. Use GitHub Copilot Chat for help. If the MCP server is set up (see the MCP setup doc), Copilot will have access to the Crowe branding standards and project conventions automatically.

**Questions?** Ask Achyuth directly or use the RAG assistant (this system) — ask it anything about the stack, branding, or workflow.
