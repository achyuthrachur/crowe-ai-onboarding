# Deploying to Vercel

Every project deploys to Vercel. This doc covers the full setup sequence from a fresh project to a live production URL, including the SSL proxy workarounds specific to working on the Crowe corporate network.

---

## Prerequisites

Before running anything:
- Node.js 20 LTS installed
- Vercel CLI installed: `npm install -g vercel` (use `NODE_TLS_REJECT_UNAUTHORIZED=0` prefix if on Crowe network)
- GitHub CLI at `C:\Users\RachurA\AppData\Local\gh-cli\bin\gh.exe`
- Git installed and configured with your name and email
- Your GitHub account added as collaborator to the `achyuthrachur` org

**Verify Vercel CLI:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel --version
```

---

## The SSL Proxy Problem

The Crowe corporate network runs an SSL inspection proxy. This intercepts TLS connections and causes certificate errors with npm, Vercel CLI, and sometimes git. The fix is simple but you must apply it consistently.

**For any npm install on the Crowe network:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install
```

**For any Vercel CLI command on the Crowe network:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel [command]
```

**For git if you hit certificate errors:**
```bash
git config --global http.sslVerify false
```

If you're working from home or outside the Crowe network, you don't need the SSL prefix — drop it and commands run normally.

---

## Full Setup Sequence — New Project from Scratch

### Step 1: Initialize the Next.js project

```bash
npx create-next-app@latest my-project-name \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-project-name
```

### Step 2: Install dependencies

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx shadcn@latest init
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install animejs framer-motion iconsax-react
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install openai
```

### Step 3: Add environment file

Create `.env.local` (gitignored by default):
```bash
cp .env.example .env.local  # if .env.example exists, otherwise create fresh
```

Minimum contents:
```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_NAME=My App Name
```

### Step 4: Initialize git and push to GitHub

```bash
git init
git add .
git commit -m "feat: initial project setup"
```

Create the GitHub repo and push in one command (using the full gh CLI path):
```bash
GH="/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe"
"$GH" repo create achyuthrachur/my-project-name \
  --public \
  --description "Short description of the project" \
  --source=. \
  --remote=origin \
  --push
```

Verify at https://github.com/achyuthrachur/my-project-name.

### Step 5: Link to Vercel

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project my-project-name
```

Vercel auto-detects Next.js and sets the right build settings. When prompted:
- Set up and deploy? **Yes**
- Which scope? **achyuth-rachurs-projects**
- Link to existing project? **No** (first time) or **Yes** if it exists
- Project name: **my-project-name**
- Directory: **./** (current directory)
- Auto-detected settings correct? **Yes**

### Step 6: Pull environment variables

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes
```

This merges any variables set in the Vercel dashboard (like database connection strings) into your local `.env.local`. Run this again whenever environment variables are added or changed in the dashboard.

### Step 7: Deploy to production

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel deploy --prod --yes
```

Vercel builds the project and gives you a production URL like `https://my-project-name.vercel.app`. From this point, every push to `main` auto-deploys.

---

## Setting Up Vercel Postgres (When You Need a Database)

Not every project needs a database. If yours does:

### Create the Postgres store

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel postgres create my-project-name-db
```

Note the store ID from the output (looks like `store_xxxxxxxxxxxx`).

### Connect it to your project

The Vercel dashboard is the easiest way:
1. Go to https://vercel.com/achyuth-rachurs-projects/my-project-name
2. Settings → Storage → Connect Store
3. Select your newly created database
4. Check all three environments (Production, Preview, Development)
5. Click Connect

### Pull the connection strings

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes
```

Your `.env.local` now has `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, and related variables. These are used by `@vercel/postgres` and Prisma.

### Enable pgvector (if you're building a RAG system)

Open the Vercel Postgres console (dashboard → Storage → your database → Query) and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Environment Variables

**Adding a new variable:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env add VARIABLE_NAME production
```
You'll be prompted to enter the value. Repeat for preview and development environments if needed.

**Listing current variables:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env ls
```

**Critical:** Never commit `.env.local` to git. It's in `.gitignore` by default. If you accidentally commit an API key, rotate it immediately at the provider.

---

## Vercel Blob Storage (for File Uploads)

If your project needs to store uploaded files (PDFs, images, documents):

### Create a Blob store

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel blob create-store my-project-name-blob
```

### Connect and pull the token

Connect via Vercel dashboard (same process as Postgres above), then:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes
```

Your `.env.local` now has `BLOB_READ_WRITE_TOKEN`. Use `@vercel/blob` in your code:
```typescript
import { put } from '@vercel/blob';

const blob = await put('filename.pdf', fileBuffer, { access: 'public' });
console.log(blob.url); // the public URL
```

---

## Ongoing Deployments

Once set up, the daily workflow is just git:

```bash
git add .
git commit -m "feat: description of what changed"
git push origin main
```

Vercel automatically deploys on every push to `main`. Check the deployment status at https://vercel.com/achyuth-rachurs-projects/[project-name]/deployments.

**Preview deployments:** Every push to a non-main branch creates a preview URL. Use this to share work in progress before merging.

---

## Checking Deployment Health

**View logs:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel logs
```

Or in the dashboard: Deployments → click a deployment → Function Logs.

**Check build errors:**
If a deployment fails, the build log in the dashboard shows exactly what broke. Most common issues:
- TypeScript type errors (fix with `npm run typecheck` locally before pushing)
- Missing environment variable (add it via `vercel env add`)
- Import path wrong (`@/` alias not resolving — check `tsconfig.json` paths)

**Run a local production build before pushing:**
```bash
npm run build
```
If this passes locally, the Vercel build will pass too.

---

## The `vercel.json` Config File

Every project has a `vercel.json` at the root with these defaults:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    },
    {
      "source": "/fonts/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

Don't change this unless you have a specific reason. The region `iad1` (US East) is what we use.

---

## Quick Reference

```bash
# Full setup (new project)
git init && git add . && git commit -m "feat: initial"
GH="/c/Users/RachurA/AppData/Local/gh-cli/bin/gh.exe"
"$GH" repo create achyuthrachur/[name] --public --source=. --remote=origin --push
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel link --yes --project [name]
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel deploy --prod --yes

# Daily workflow
git add . && git commit -m "feat: ..." && git push origin main

# Check logs
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel logs

# Add env var
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env add KEY_NAME production

# Pull updated env vars
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel env pull .env.local --yes
```
