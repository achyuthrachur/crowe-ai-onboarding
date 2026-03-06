# Project Patterns

How projects on this team are structured, why they're structured that way, and what to do when you're starting something new.

---

## The Core Principle: Separate Data from Components

Every project on this team enforces one architectural rule above all others: **all content, configuration, and data lives in `/src/data/`. Components receive this as props and render it. Components never hardcode content.**

This isn't just organization preference — it's how we build tools that are fast to update and easy to demo under pressure.

**The practical reason:** When a client says "change that number" or "swap this chart's scenario" 10 minutes before a presentation, you open one data file, change one value, and you're done. You don't hunt through JSX. You don't risk breaking layout logic. The data layer and the display layer are separate.

**The Claude Code reason:** When an AI coding agent iterates on a project, you want it to update content in data files and update layout in component files — two clearly separated concerns, two separate tasks, two separate context windows.

---

## Project Structure

Every new project follows this structure:

```
src/
  app/
    page.tsx              ← root route
    layout.tsx            ← fonts, metadata, providers
    globals.css           ← Crowe brand tokens, shadcn overrides
    api/
      [endpoint]/
        route.ts          ← API routes (OpenAI calls, DB queries)
  components/
    ui/                   ← shadcn components (auto-generated, don't edit manually)
    layout/               ← nav, sidebar, footer, shell components
    [feature]/            ← feature-specific components grouped by domain
  data/
    config.ts             ← app-level configuration and settings
    [domain].ts           ← content, labels, mock data by domain
  lib/
    [utility].ts          ← shared utilities, helpers, clients
  types/
    index.ts              ← shared TypeScript interfaces and types
```

Not every project has all of these folders — smaller tools might have just `app/`, `components/`, and `data/`. But the pattern is consistent.

---

## The Data Layer in Practice

Look at how `alm-insight-suite` structures its data:

```
src/data/
  config.ts           ← institution name, app settings
  scenarios.ts        ← scenario definitions (base, stress, severe)
  assumptions.ts      ← rate assumptions per scenario
  chartData.ts        ← pre-computed chart datasets
```

And in `ai-close-demo`:
```
src/data/
  apInvoices.ts       ← synthetic AP invoice records
  journalEntries.ts   ← synthetic journal entries
  chartOfAccounts.ts  ← chart of accounts structure
  config.ts           ← app configuration
```

The data files export typed TypeScript objects:
```typescript
// src/data/scenarios.ts
export interface Scenario {
  id: string;
  label: string;
  rateShift: number;
  description: string;
}

export const scenarios: Scenario[] = [
  { id: 'base', label: 'Base Case', rateShift: 0, description: 'Current rate environment' },
  { id: 'up200', label: '+200bps', rateShift: 200, description: 'Rates rise 200 basis points' },
  { id: 'down100', label: '-100bps', rateShift: -100, description: 'Rates fall 100 basis points' },
];
```

A component imports and uses this:
```typescript
// src/components/ScenarioSelector.tsx
import { scenarios } from '@/data/scenarios';

export function ScenarioSelector({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div>
      {scenarios.map(s => (
        <button key={s.id} onClick={() => onSelect(s.id)}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
```

The component knows nothing about what a scenario is. It just renders what it receives.

---

## Pre-Computing for Demos

**Never rely on live AI calls or live computations during a client presentation.**

This is a hard rule. Demos break under pressure — network hiccups, API timeouts, slow responses. Pre-compute everything and inject pre-validated results.

**The pattern:**
```typescript
// src/data/demoResults.ts
// Pre-computed AI analysis results — validated before the demo
export const demoResults = {
  scenario1: {
    nirSensitivity: '+12.4%',
    npvImpact: '-$2.1M',
    aiNarrative: 'Under a +200bps shock, net interest income increases by 12.4% as the institution\'s asset-sensitive balance sheet reprices faster than liabilities...',
  },
  // ...
};
```

In the component, you reference `demoResults.scenario1.aiNarrative` directly — not an OpenAI call that could take 3 seconds and timeout at the wrong moment.

Real AI calls are fine in production tools with real users who have patience. For workshop demos and client-facing presentations, pre-compute.

---

## Component Conventions

**Named exports only:**
```typescript
// ✅ Good
export function Dashboard() { ... }
export interface DashboardProps { ... }

// ❌ Bad
export default function Dashboard() { ... }
```

**Props interfaces above the component:**
```typescript
interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({ label, value, trend, className }: MetricCardProps) {
  // ...
}
```

**File naming:**
- Components: `PascalCase` — `MetricCard.tsx`, `ChatWindow.tsx`
- Utilities and hooks: `camelCase` — `useScrollPosition.ts`, `formatCurrency.ts`
- Data files: `camelCase` — `scenarios.ts`, `chartData.ts`
- Routes: `kebab-case` — `app/dashboard/page.tsx`, `app/api/chat/route.ts`

**Co-location for complex components:**
If a component has sub-components, group them:
```
components/
  chat/
    ChatWindow.tsx
    MessageList.tsx
    MessageBubble.tsx
    ChatInput.tsx
```

Simple components with one file stay flat in the feature folder.

---

## TypeScript Rules

From CLAUDE.md — these are non-negotiable:

- `interface` for object shapes, `type` for unions
- Always type parameters and return values on functions
- Never use `any` — use `unknown` and narrow it, or define the proper type
- Import types with `import type { Foo }` when only using as a type

```typescript
// Interface for object shape
interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

// Type for union
type Status = 'idle' | 'loading' | 'success' | 'error';

// Function with types
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json() as User;
}
```

---

## Import Alias

Every project is set up with the `@/` import alias pointing to `src/`. Use it consistently:

```typescript
// ✅ Good
import { scenarios } from '@/data/scenarios';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { openai } from '@/lib/openai';

// ❌ Bad
import { scenarios } from '../../data/scenarios';
```

The alias is configured in `tsconfig.json` and automatically recognized by VSCode.

---

## API Route Pattern

All server-side logic goes in API routes. The standard pattern:

```typescript
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: 'You are...' },
        { role: 'user', content: message },
      ],
    });

    return NextResponse.json({
      answer: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Always:**
- Validate inputs before calling external services
- Wrap in try/catch and return proper error responses
- Use environment variables for API keys (never hardcode)
- Return typed, consistent JSON shapes

---

## Git Workflow

**Branch naming:**
- `feature/[description]` — new features
- `bugfix/[description]` — bug fixes
- `hotfix/[description]` — urgent production fixes

**Commit messages (Conventional Commits):**
```
feat: add scenario selector to ALM dashboard
fix: correct interest calculation for adjustable rate loans
docs: update README with deployment instructions
style: apply Crowe brand tokens to metric cards
refactor: extract chart data to data layer
chore: update dependencies
```

**Daily workflow:**
```bash
git add .
git commit -m "feat: description"
git push origin main
```

Vercel auto-deploys on push to main. No manual deploy step needed after initial setup.

---

## Quality Gates

Before pushing to main, verify:

```bash
npm run build        # TypeScript + build must pass — no errors
npm run lint         # ESLint must pass — no errors, warnings ok
npm run typecheck    # tsc --noEmit — zero type errors
```

After deployment:
- Open the production URL and verify it loads
- Check the browser console for errors
- Test the main user flow once
- Run Lighthouse in Chrome DevTools — Performance must be 90+, Accessibility 90+

If Lighthouse performance is below 90: check for oversized images (add `next/image`), unoptimized fonts, or large JavaScript bundles (check the Vercel build output for bundle size warnings).
