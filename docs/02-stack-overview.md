# The Stack — What We Use and Why

Every project on this team uses the same core stack. This isn't arbitrary — each choice has a specific reason, and understanding the reasoning will help you make the right decisions when something isn't covered in a spec.

---

## The Mental Model

Think of the stack in five layers, each with a clear job:

```
Framework         Next.js 14 (App Router)       Routing, rendering, API routes
Styling           Tailwind CSS + CSS Variables   Layout, spacing, responsiveness
Components        shadcn/ui                      Base UI primitives
Animation         Anime.js v4 / Framer Motion    Motion and interaction
Icons             Iconsax                        Icon library
```

Every project follows this layering. You pick from this list — you don't introduce new libraries without a good reason and alignment with Achyuth.

---

## Next.js 14 — App Router

We use Next.js 14 with the App Router (not Pages Router). This is important — the App Router uses a different file structure and different patterns for layouts, loading states, and server vs. client components.

**Why App Router over Pages Router:**
- Co-located layouts at any route level
- Server Components by default — only add `"use client"` when you need interactivity
- API routes live in `app/api/[route]/route.ts` — each exports named HTTP methods (`GET`, `POST`, etc.)
- Better for the kind of dashboard and tool apps we build

**Key App Router rules:**
- `app/page.tsx` is the root route
- `app/layout.tsx` wraps everything — fonts, metadata, global providers go here
- `app/api/chat/route.ts` is an API route — exports `export async function POST(request: Request)`
- Add `"use client"` at the top of any file that uses React hooks, event handlers, or browser APIs
- Do not add `"use client"` unless necessary — server components are faster

**TypeScript is mandatory.** Every file is `.ts` or `.tsx`. Never `.js`.

**Project init command:**
```bash
npx create-next-app@latest [project-name] --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

This gives you the right starting point. Then immediately run:
```bash
npx shadcn@latest init
```

---

## Tailwind CSS

We use Tailwind CSS for all styling. No CSS modules, no styled-components, no inline style objects.

**Why Tailwind:**
- Utility-first — you apply styles directly in JSX, no context switching
- Co-located with the component — easy to see what something looks like without a separate CSS file
- Responsive utilities built in (`md:`, `lg:`, etc.)
- Tree-shaken in production — only classes you use end up in the bundle

**How we extend Tailwind:**
The `tailwind.config.ts` in every project is extended with Crowe brand tokens. You get custom classes like `bg-crowe-indigo-dark`, `text-crowe-amber`, `shadow-crowe-md`. These are defined in the config and match the DESIGN.md spec exactly. Do not use raw hex values in className strings — use the token names.

**CSS Variables for dynamic values:**
Some values (like shadow opacity or surface colors) are defined as CSS custom properties in `globals.css` and referenced in Tailwind via `var(--token-name)`. The full list is in the DESIGN.md / branding guide.

**What you'll write:**
```tsx
// Good — uses Tailwind utilities and Crowe tokens
<div className="bg-page rounded-xl shadow-crowe-md p-6">
  <h2 className="text-2xl font-bold text-crowe-indigo-dark">Title</h2>
</div>

// Bad — raw CSS, inline styles, arbitrary values for things that have tokens
<div style={{ background: '#011E41', padding: 24 }}>
```

---

## shadcn/ui

shadcn is how we get production-quality UI components without building them from scratch. It's not a component library you install as a dependency — it's a CLI that copies component source code directly into your project at `src/components/ui/`.

**Why shadcn:**
- You own the code — full control over every component
- Built on Radix UI primitives (accessible, keyboard-navigable, ARIA-compliant out of the box)
- Reads from CSS variables — set the Crowe brand colors once in globals.css and every component inherits them
- Works perfectly with Tailwind

**Installing a component:**
```bash
npx shadcn@latest add button
npx shadcn@latest add badge input textarea dialog
```

**The Crowe theme override:**
After `shadcn init`, immediately apply the HSL variable overrides in `globals.css` from DESIGN.md. This maps shadcn's CSS variables to Crowe's palette. Once done, every shadcn component is automatically on-brand.

**When to use shadcn vs. building from scratch:**
Use shadcn for: buttons, inputs, dialogs, dropdowns, tooltips, badges, tabs, tables, select menus, checkboxes, radio groups, progress bars — anything that needs interaction states and accessibility.

Build from scratch only for: purely presentational layouts, custom chart overlays, or specific visual patterns that shadcn doesn't cover.

**Important:** Never use shadcn's default colors. The theme override is mandatory. A shadcn Button without the Crowe theme looks generic and wrong.

---

## The Data Layer Pattern

This is the most important architectural pattern on this team. Every project separates content and configuration from components.

**The rule:** All data, content, labels, mock data, and configuration lives in `/src/data/` as structured TypeScript objects. Components receive this data as props and render it. Components never hardcode content.

```
src/
  data/
    config.ts         ← app-level configuration
    navItems.ts       ← navigation structure
    chartData.ts      ← mock data for charts
    scenarios.ts      ← scenario definitions
  components/
    Dashboard.tsx     ← receives data as props, renders it
    Chart.tsx         ← receives chartData as prop
```

**Why this matters:**
- Demo updates don't require touching component logic — just update the data file
- Claude Code can iterate on content (data files) separately from layout (components)
- When a client asks "can you change this number?" — one file edit, done
- Components stay clean and testable

You'll see this pattern in every project. `alm-insight-suite` has `src/data/` with separate files for scenario assumptions, macro inputs, and chart configurations. `wire-anomaly-detection` has synthetic wire data in the data layer. Follow this pattern in any new work.

---

## API Routes

Next.js API routes handle all server-side logic — OpenAI calls, database queries, external API calls. They live in `src/app/api/`.

```typescript
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { message } = await request.json();
  // ... OpenAI call
  return NextResponse.json({ answer: '...' });
}
```

**Never call OpenAI directly from a client component.** The API key lives in the server environment. Client-side code never sees it. All AI calls go through API routes.

**When to use API routes vs. Server Actions:**
- Use API routes when the client calls the backend explicitly (chat interfaces, form submissions, data fetches)
- Server Actions work for simpler form mutations but we default to API routes for clarity and debuggability

---

## State Management

For most projects, React's built-in `useState` and `useContext` are enough.

```
useState        ← local component state (form fields, UI toggles)
useContext      ← app-wide state shared across the tree (current document, chat history)
Zustand         ← only if state is complex, deeply nested, or needs actions
```

The `model-intake-agent` project uses Zustand for its multi-step form state because it spans several components and steps. That's the right call for that complexity. For simpler tools like the regulatory assistant, a single `AppContext` with `useReducer` is enough.

**Never use Redux.** It's not in our stack.

---

## Database — Prisma + PostgreSQL

When a project needs persistence, we use Prisma as the ORM and PostgreSQL as the database. On Vercel, this is Vercel Postgres (managed Postgres, free tier for demos).

```bash
npm install prisma @prisma/client
npx prisma init
```

The schema lives in `prisma/schema.prisma`. Run migrations with:
```bash
npx prisma db push        # dev — pushes schema directly
npx prisma migrate dev    # creates a named migration file
npx prisma studio         # GUI to browse your data
```

Not all projects need a database. The regulatory assistant has no DB — state is ephemeral in React. `model-intake-risk-tiering` has a full Prisma schema for models, findings, validations. If you're not sure whether a project needs persistence, ask.

---

## TypeScript Rules

These come from the master CLAUDE.md and are non-negotiable:

- Use `interface` for object shapes: `interface UserProps { name: string; age: number }`
- Use `type` for unions and intersections: `type Status = 'active' | 'inactive'`
- Always type function parameters and return values
- Never use `any` — use `unknown` and narrow it, or define the proper type
- Named exports only — no default exports from components

```typescript
// Good
export interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function Message({ role, content, timestamp }: MessageProps) {
  // ...
}

// Bad
export default function Message(props: any) { ... }
```

---

## Deployment

All projects deploy to Vercel. No exceptions. See the deployment guide (doc 05) for the full setup sequence including the SSL proxy workarounds specific to the Crowe network.

The short version:
```bash
git push origin main     # triggers automatic Vercel deployment
```

Once a project is linked to Vercel via `vercel link`, every push to `main` auto-deploys to production. Preview deployments happen on every branch push.
