# Resource Directory

Every tool and resource we use, in one place. Bookmark this.

---

## Core Stack

| Resource | URL | What it is |
|----------|-----|------------|
| Next.js Docs | https://nextjs.org/docs | Framework reference — App Router section most relevant |
| Next.js App Router | https://nextjs.org/docs/app | Layouts, routing, server components, API routes |
| Tailwind CSS | https://tailwindcss.com/docs | Utility class reference — search by property |
| TypeScript Handbook | https://www.typescriptlang.org/docs/handbook | Language reference |
| React Docs | https://react.dev | Hooks, patterns, performance |

---

## UI Components

| Resource | URL | What it is |
|----------|-----|------------|
| shadcn/ui | https://ui.shadcn.com | Component docs, install commands, theming |
| shadcn Blocks | https://ui.shadcn.com/blocks | Full page layouts and dashboards as starting points |
| 21st.dev | https://21st.dev/community/components | Premium animated community components — browse and copy |
| React Bits | https://reactbits.dev | 110+ animated components with TS-TW variants |
| Radix UI | https://www.radix-ui.com | Underlying primitives for shadcn — use for accessibility reference |

---

## Icons

| Resource | URL | What it is |
|----------|-----|------------|
| Iconsax | https://app.iconsax.io | 1,000 icons × 6 styles — our primary icon library |
| Lucide React | https://lucide.dev | Fallback when Iconsax doesn't have what you need |

Browse Iconsax by name, see all 6 style variants side by side, copy the React import directly from the site.

---

## Animation

| Resource | URL | What it is |
|----------|-----|------------|
| Anime.js v4 | https://animejs.com/documentation | Scroll-triggered, staggered, SVG, timeline animations |
| Framer Motion | https://motion.dev | React layout animations, AnimatePresence, gestures |
| Motion Easing Visualizer | https://easings.net | Visual reference for easing functions |

---

## Crowe Brand

| Resource | URL | What it is |
|----------|-----|------------|
| Crowe Brand Hub | https://www.crowedigitalbrand.com | Official brand guidelines — source of truth |
| Crowe Color System | https://www.crowedigitalbrand.com/color | Color palette, usage rules |
| Crowe Typography | https://www.crowedigitalbrand.com/typography | Helvetica Now specs, type scale |
| Crowe Logo Downloads | https://www.crowedigitalbrand.com/logo | SVG and PNG logo files |
| Contrast Checker | https://webaim.org/resources/contrastchecker | Verify text/background meets WCAG AA (4.5:1 ratio) |

**Local logo files** (already in the project folder):
- `crowe-logo.svg` — color version (for light backgrounds)
- `crowe-logo-white.svg` — white version (for Indigo Dark backgrounds like nav and hero)

Both are in `C:\Users\RachurA\OneDrive - Crowe LLP\VS Code Programming Projects\` and also copied into most individual project roots.

---

## AI / OpenAI

| Resource | URL | What it is |
|----------|-----|------------|
| OpenAI API Docs | https://platform.openai.com/docs | API reference, models, pricing |
| OpenAI Playground | https://platform.openai.com/playground | Test prompts before putting them in code |
| OpenAI API Keys | https://platform.openai.com/api-keys | Manage your API keys |
| OpenAI Node SDK | https://github.com/openai/openai-node | npm package docs and examples |
| OpenAI Tokenizer | https://platform.openai.com/tokenizer | Count tokens in a prompt before sending |

**Models we use:**
- `gpt-4o` — primary model for all chat and completion tasks
- `text-embedding-3-small` — embeddings for RAG systems (1536 dims, fast and cheap)

---

## Deployment

| Resource | URL | What it is |
|----------|-----|------------|
| Vercel Dashboard | https://vercel.com/achyuth-rachurs-projects | All project deployments |
| Vercel Docs | https://vercel.com/docs | Deployment reference |
| Vercel Postgres Docs | https://vercel.com/docs/storage/vercel-postgres | Managed PostgreSQL |
| Vercel Blob Docs | https://vercel.com/docs/storage/vercel-blob | File storage |
| GitHub | https://github.com/achyuthrachur | All project repos |

---

## Database

| Resource | URL | What it is |
|----------|-----|------------|
| Prisma Docs | https://www.prisma.io/docs | ORM reference — schema, migrations, queries |
| Prisma Schema Reference | https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference | All model field types |
| pgvector | https://github.com/pgvector/pgvector | PostgreSQL extension for vector similarity search (RAG) |
| Vercel Postgres Console | https://vercel.com (Storage section) | Run SQL queries on your Vercel Postgres database |

---

## VSCode Extensions

Install these from the VSCode Extensions sidebar (`Ctrl+Shift+X`):

| Extension | Publisher | What it does |
|-----------|-----------|-------------|
| GitHub Copilot | GitHub | AI code completion |
| GitHub Copilot Chat | GitHub | AI chat in sidebar |
| ESLint | Microsoft | TypeScript/React linting |
| Prettier | Prettier | Code formatting |
| Tailwind CSS IntelliSense | Bradlc | Tailwind class autocomplete |
| Prisma | Prisma | Schema syntax highlighting |
| Thunder Client | Rangav | Test API routes without leaving VSCode |
| GitLens | GitKraken | Enhanced git history and blame |

---

## Useful npm Commands

```bash
# Create a new Next.js project
npx create-next-app@latest [name] --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Add shadcn and a component
npx shadcn@latest init
npx shadcn@latest add button badge input dialog

# Install core dependencies
npm install animejs framer-motion iconsax-react openai
npm install @vercel/postgres @vercel/blob

# Prisma
npm install prisma @prisma/client
npx prisma init
npx prisma db push
npx prisma studio

# Check types and build
npm run typecheck
npm run build
npm run lint
```

---

## Crowe Network Workarounds

For any npm or Vercel CLI command on the Crowe corporate network, prefix with:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 [command]
```

For git if you hit certificate errors:
```bash
git config --global http.sslVerify false
```

For shadcn init (registry calls go through npm proxy):
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx shadcn@latest init
```

---

## Quick Reference — Crowe Color Tokens

The most-used values. Full spec in the branding guide.

```
Page background:    #f8f9fc   (never pure white)
Primary text:       #2d3142   (never pure black)
Secondary text:     #545968
Muted text:         #8b90a0
Card background:    #ffffff   (white card on off-white page = soft float)
Indigo Dark:        #011E41   (nav, hero, footer, dark surfaces)
Indigo Core:        #002E62   (hover states)
Amber Core:         #F5A800   (CTAs, active states, highlights)
Success/Teal:       #05AB8C
Error/Coral:        #E5376B
Card shadow:        0 1px 3px rgba(1,30,65,0.04), 0 6px 16px rgba(1,30,65,0.04)
```
