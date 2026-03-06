# UI Libraries — What to Use and When

We have five libraries available for UI and animation work. Each one has a specific job. The most common mistake is reaching for the wrong one — building something from scratch that React Bits already has, or using Anime.js when a simple Tailwind transition would do.

This doc covers every library, what it's for, and the decision rules.

---

## The Decision Tree

When you need to build a UI element, work through this in order:

1. **Does shadcn have it?** → Use shadcn. (Buttons, inputs, dialogs, tabs, badges, dropdowns, tables, checkboxes.)
2. **Does 21st.dev have a better animated version?** → Use 21st.dev. (Animated heroes, premium card variants, fancy nav patterns.)
3. **Does React Bits have it?** → Use React Bits. (Animated text, background effects, interactive components.)
4. **Do you need a specific animation not covered by the above?** → Anime.js v4 (scroll-triggered, staggered lists, countUp, SVG drawing) or Framer Motion (React layout animations, AnimatePresence, gesture-driven).
5. **Is it just a hover/transition/opacity change?** → Tailwind `transition-*` classes. Don't import a library for a 200ms fade.

---

## shadcn/ui

**What it is:** UI component primitives. Built on Radix UI (accessible), styled with Tailwind, code copied directly into your project.

**Install:**
```bash
npx shadcn@latest add [component]
```

**The full list of components we use:**
Button, Badge, Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, Dialog, Sheet, Popover, Tooltip, DropdownMenu, NavigationMenu, Tabs, Accordion, Table, Progress, Skeleton, Separator, ScrollArea, Form, Label, Avatar, Card, Calendar.

**Mandatory after init:** Apply the Crowe HSL overrides to `globals.css` (see branding guide). Without this, everything looks like default shadcn gray. With it, every component automatically uses Crowe Indigo and Amber.

**When NOT to use shadcn:** Pure layout containers (use a div + Tailwind), custom chart elements, anything that doesn't need accessibility primitives or interaction states.

---

## 21st.dev

**What it is:** Community-built premium React components. Higher polish than base shadcn. Browse the gallery, find what you need, copy the code.

**URL:** https://21st.dev/community/components

**How to use it:** Browse the site, preview the component in the interactive demo, click "Code" to see the implementation, copy it into your project. Apply Crowe tokens to replace default colors.

**Best categories for our work:**
- **Heroes** — animated landing page hero sections for workshop-facing apps
- **Buttons** — magnetic buttons, glow buttons, ripple CTAs
- **Backgrounds** — particle fields, mesh gradients, animated dot patterns (good for demo app landing pages)
- **Cards** — hover-animated feature cards, spotlight cards, tilt cards
- **Text** — gradient text, typewriter effects, animated reveals

**Crowe token substitution rules:**
When you copy a 21st.dev component, replace:
- Any blue → `var(--crowe-indigo-dark)` (`#011E41`)
- Any gold/orange/yellow accent → `var(--crowe-amber-core)` (`#F5A800`)
- Any gray background → `var(--color-surface-page)` (`#f8f9fc`)
- Any black → `var(--crowe-tint-950)` (`#1a1d2b`)
- Any generic shadow → the Crowe indigo-tinted shadow values

**When to reach for 21st.dev:** When you're building a workshop-facing or client-demo-facing app and want a polished first impression. Not every tool needs it — internal admin panels don't.

---

## React Bits

**What it is:** 110+ animated React components. Copy-paste or CLI install. Each comes in four variants — always use the TS-TW (TypeScript + Tailwind) version.

**Docs:** https://reactbits.dev

**Install a component:**
```bash
npx shadcn@latest add @react-bits/[Component]-TS-TW
```

Or copy the code manually from the site.

**The components we actually use:**

| Component | Rating | Use case |
|-----------|--------|----------|
| `BlurText` | ⭐⭐⭐ | Hero heading reveals — text blurs in word by word |
| `SplitText` | ⭐⭐⭐ | Character-level animated text reveals |
| `CountUp` | ⭐⭐⭐ | Animated number counters for stats/metrics |
| `GradientText` | ⭐⭐ | Indigo-to-amber gradient on display text |
| `TiltCard` | ⭐⭐⭐ | 3D perspective tilt on hover — great for feature cards |
| `SpotlightCard` | ⭐⭐⭐ | Mouse-follow spotlight effect on cards |
| `Aurora` | ⭐⭐⭐ | Full-background aurora animation — use for hero sections |
| `Particles` | ⭐⭐ | Floating particle field background |
| `AnimatedList` | ⭐⭐⭐ | Staggered list item entrances |
| `Dock` | ⭐⭐ | macOS-style dock — use for tool navigation |

**Crowe color config for React Bits backgrounds:**
```javascript
// Aurora
colors={['#011E41', '#002E62', '#F5A800', '#003F9F']}

// Particles
color="#F5A800"  // or "#003F9F" for subtler
```

**Important:** Always wrap React Bits animated components in a `prefers-reduced-motion` check. The library handles this internally on most components, but verify.

---

## Anime.js v4

**What it is:** Low-level animation engine. Animates DOM elements, CSS properties, SVG, and plain JavaScript objects. The most powerful option when React Bits or Framer Motion don't have the specific pattern you need.

**Install:**
```bash
npm install animejs
```

**Import only what you need** — Anime.js v4 is modular:
```javascript
import { animate, stagger, onScroll, createTimeline } from 'animejs';
```

**The five patterns we use most:**

**1. Staggered list entrance:**
```javascript
animate('.card', {
  opacity: [0, 1],
  translateY: [20, 0],
  duration: 600,
  delay: stagger(80),
  ease: 'outQuint'
});
```

**2. Scroll-triggered reveal:**
```javascript
onScroll({
  target: '.section',
  enter: 'bottom 80%',
  onEnter: () => {
    animate('.section .content', {
      opacity: [0, 1],
      translateY: [40, 0],
      duration: 700,
      ease: 'outQuint'
    });
  }
});
```

**3. CountUp (stats and metrics):**
```javascript
animate('.stat-number', {
  innerHTML: [0, 500],
  round: 1,
  duration: 2000,
  ease: 'outExpo'
});
```

**4. Amber pulse glow (CTAs, important actions):**
```javascript
animate('.cta-button', {
  boxShadow: [
    '0 0 0 0 rgba(245, 168, 0, 0.4)',
    '0 0 0 12px rgba(245, 168, 0, 0)',
  ],
  duration: 1500,
  loop: true,
  ease: 'outQuad'
});
```

**5. Sequenced timeline (multi-step reveals):**
```javascript
const tl = createTimeline();
tl.add('.hero-title', { opacity: [0, 1], translateY: [30, 0], duration: 600 })
  .add('.hero-subtitle', { opacity: [0, 1], translateY: [20, 0], duration: 500 }, 200)
  .add('.hero-cta', { opacity: [0, 1], scale: [0.9, 1], duration: 400 }, 400);
```

**In React, always use `createScope` for cleanup:**
```javascript
import { animate, stagger, createScope } from 'animejs';
import { useEffect, useRef } from 'react';

function AnimatedList() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({ root }).add(() => {
      animate('.item', {
        opacity: [0, 1],
        translateY: [16, 0],
        delay: stagger(60),
        duration: 400,
        ease: 'outQuint'
      });
    });
    return () => scope.current?.revert();
  }, []);

  return <div ref={root}>{/* items */}</div>;
}
```

**When to use Anime.js over Framer Motion:**
- Scroll-triggered animations (onScroll)
- SVG drawing / path animations (createDrawable)
- Staggered list entrances driven by DOM queries
- CountUp number animations
- Anything requiring a timeline with precise sequencing

---

## Framer Motion

**What it is:** React-specific animation library. Handles layout animations, gesture-driven interactions, and mount/unmount transitions that are hard to do with Anime.js.

**Install:**
```bash
npm install framer-motion
```

**When to use Framer Motion over Anime.js:**
- Layout animations (elements physically repositioning — `layoutId`)
- Mount/unmount transitions (AnimatePresence)
- Gesture-driven interactions (drag, whileHover, whileTap)
- React-native animated presence that responds to state changes

**The patterns we use:**

**Standard page element entrance:**
```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
>
```

**Staggered children:**
```jsx
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => <motion.li key={i.id} variants={item}>{i.name}</motion.li>)}
</motion.ul>
```

**AnimatePresence (mount/unmount):**
```jsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {isVisible && (
    <motion.div
      key="panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    />
  )}
</AnimatePresence>
```

**Scroll-triggered (whileInView):**
```jsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
/>
```

---

## Iconsax

**What it is:** 1,000 icons in 6 styles. Replaces Lucide React for richer icon options.

**Install:**
```bash
npm install iconsax-react
```

**The 6 styles:**
- `Linear` — thin outline, default for body and nav
- `Bold` — filled, use for active states and CTAs
- `Outline` — medium outline, secondary buttons
- `TwoTone` — dual-color, use with Indigo + Amber for feature highlights
- `Bulk` — filled with opacity, use in dashboards
- `Broken` — gapped outline, decorative only

**Usage:**
```jsx
import { Chart, ArrowRight, DocumentText } from 'iconsax-react';

// Body icon
<Chart color="currentColor" variant="Linear" size={20} />

// CTA icon
<ArrowRight color="var(--crowe-amber-core)" variant="Bold" size={20} />

// Feature highlight (two-tone)
<DocumentText color="var(--crowe-indigo-dark)" variant="TwoTone" size={32} />
```

**Sizing rules:**
- 16px — tight inline contexts
- 20px — standard inline with text
- 24px — standalone icon buttons
- 32px — feature icons in cards
- 48px — hero / display icons

**Browse:** https://app.iconsax.io — search by name, preview all 6 variants, copy the import.

---

## Animation Timing Reference

These timing values come from the CLAUDE.md master design system. Use them consistently:

```css
--duration-instant: 75ms    /* Toggle, micro-feedback */
--duration-fast: 150ms      /* Hover states */
--duration-normal: 250ms    /* Standard transitions */
--duration-slow: 350ms      /* Complex state changes */
--duration-slower: 500ms    /* Page transitions, reveals */

--ease-out: cubic-bezier(0.16, 1, 0.3, 1)       /* Enter animations */
--ease-in: cubic-bezier(0.7, 0, 0.84, 0)        /* Exit animations */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)   /* Symmetric */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1) /* Bouncy */
```

In Anime.js: `ease: 'outQuint'` is the closest match to `--ease-out`. In Framer Motion: `ease: [0.16, 1, 0.3, 1]`.

**The rule:** Never animate longer than 500ms for a UI element. Longer animations make interfaces feel sluggish. Reserve 700-800ms for page-level reveals or scroll-triggered sequences where the delay adds drama.

---

## The `prefers-reduced-motion` Rule

Every animation must be wrapped in a reduced motion check. This is non-negotiable.

```css
/* In globals.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

In JavaScript (for Anime.js / Framer Motion):
```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  animate('.card', { /* animation */ });
}
```

Framer Motion respects this automatically if you use `useReducedMotion()` hook.
