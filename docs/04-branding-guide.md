# Crowe Brand Guide

Everything in this guide comes from the official Crowe brand system. The canonical source is https://www.crowedigitalbrand.com — check there for updated guidelines if something here feels outdated.

This doc is the practical version — the rules you'll actually apply when building UIs, not the full brand book.

---

## The Feel

Before any specific tokens: the goal is **warm, soft, and premium**. Not cold corporate. Not clinical. Not generic SaaS.

The reference frame is high-end consulting: generous whitespace, warm cream backgrounds, cards that float on soft shadows, amber accents that draw the eye exactly where you want it, smooth transitions everywhere.

**The three-word test:** Does it feel trustworthy, confident, and approachable? If it looks like a hospital admin interface or a default Bootstrap page, something's wrong. If it feels like it belongs next to the Crowe website, you're on track.

---

## Primary Colors

These two colors dominate everything. They must be present in every application.

| Color | Name | Hex | Use |
|-------|------|-----|-----|
| ![#011E41](https://via.placeholder.com/14/011E41/000000?text=+) | Crowe Indigo Dark | `#011E41` | Primary background (hero, nav, footer), primary text, dominant surface |
| ![#002E62](https://via.placeholder.com/14/002E62/000000?text=+) | Crowe Indigo Core | `#002E62` | Hover states for indigo elements, secondary dark surfaces |
| ![#003F9F](https://via.placeholder.com/14/003F9F/000000?text=+) | Crowe Indigo Bright | `#003F9F` | Links, interactive states |
| ![#F5A800](https://via.placeholder.com/14/F5A800/000000?text=+) | Crowe Amber Core | `#F5A800` | CTAs, active states, highlights, accent elements |
| ![#D7761D](https://via.placeholder.com/14/D7761D/000000?text=+) | Crowe Amber Dark | `#D7761D` | Amber hover states |
| ![#FFD231](https://via.placeholder.com/14/FFD231/000000?text=+) | Crowe Amber Bright | `#FFD231` | Light amber accents |

**The 60/30/10 rule:**
- 60% — warm neutrals and off-whites (page backgrounds, card surfaces)
- 30% — Crowe Indigo (navigation, headers, text, brand moments)
- 10% — Crowe Amber (CTAs, links, active indicators, the thing you want the eye to go to)

---

## Secondary Colors

These are accents only. Use for data visualization, icons with meaning, status indicators. Never for text, backgrounds, or dominant UI elements.

| Color | Name | Hex | Typical use |
|-------|------|-----|-------------|
| `#05AB8C` | Crowe Teal | Primary color for success/positive states |
| `#54C0E8` | Crowe Cyan | Data chart accent, info states |
| `#0075C9` | Crowe Blue | Link secondary, data accent |
| `#B14FC5` | Crowe Violet | Data chart secondary |
| `#E5376B` | Crowe Coral | Error states, destructive actions |

---

## Warm Neutrals (Use These Instead of Gray)

Every "gray" on this design system has a slight indigo warmth. This is what prevents the UI from feeling cold.

```css
--crowe-tint-950: #1a1d2b   /* Near-black — use instead of #000 */
--crowe-tint-900: #2d3142   /* Primary text — NOT #333 or #000 */
--crowe-tint-700: #545968   /* Secondary text */
--crowe-tint-500: #8b90a0   /* Muted, placeholder text */
--crowe-tint-300: #c8cbd6   /* Borders when needed */
--crowe-tint-200: #dfe1e8   /* Very subtle separators */
--crowe-tint-100: #eef0f4   /* Background accent */
--crowe-tint-50:  #f6f7fa   /* Off-white section backgrounds */
```

**Never use `#333333` for text.** Use `#2d3142`. Never `#000000`. Use `#1a1d2b`.

---

## Surface Colors (Backgrounds)

```css
--color-surface-page:       #f8f9fc   /* Page background — never pure white */
--color-surface-primary:    #fafbfd   /* Card/content background */
--color-surface-secondary:  #f6f7fa   /* Alternating section backgrounds */
--color-surface-elevated:   #ffffff   /* Modals, popovers — pure white only here */
--color-surface-brand:      #011E41   /* Hero sections, dark panels, nav, footer */
--color-surface-brand-soft: #f0f2f8   /* Light indigo wash for feature sections */
--color-surface-amber-soft: #fff8eb   /* Very light amber wash for highlights */
```

**The most important rule:** `background: #f8f9fc` for your page, not `background: #ffffff`. The difference is subtle but it's what makes the cards feel like they're floating. Pure white page + white cards = no depth. Off-white page + white cards = soft elevation.

---

## Typography

**Primary typeface: Helvetica Now**

Crowe uses Helvetica Now, transitioning from legacy Helvetica. It must be self-hosted (license required) or loaded via Adobe Fonts. If you don't have the license, use the fallback stack:

```css
font-family: Arial, 'Helvetica Neue', Helvetica, system-ui, sans-serif;
```

**Three weights in use:**
- `Helvetica Now Display Bold` — headlines, display text, the big stuff
- `Helvetica Now Text Bold` — subheadings, labels, anything that needs weight but isn't a display element
- `Helvetica Now Text Regular` — body copy, UI text, form labels

**Type scale:**
```css
--text-xs:   0.75rem   /* 12px — captions, fine print */
--text-sm:   0.875rem  /* 14px — secondary UI text */
--text-base: 1rem      /* 16px — body */
--text-lg:   1.125rem  /* 18px — emphasized body */
--text-xl:   1.25rem   /* 20px — small headings */
--text-2xl:  1.5rem    /* 24px — section headings */
--text-3xl:  1.875rem  /* 30px — page headings */
--text-4xl:  2.25rem   /* 36px — hero headings */
--text-5xl:  3rem      /* 48px — display text */
```

---

## Shadow System

Shadows use indigo-tinted rgba, not pure black. This ties back to the brand and avoids the cold gray look.

```css
/* Use these — indigo-tinted */
--shadow-sm:  0 1px 3px rgba(1, 30, 65, 0.06), 0 1px 2px rgba(1, 30, 65, 0.04)
--shadow-md:  0 4px 8px -2px rgba(1, 30, 65, 0.06), 0 2px 4px -1px rgba(1, 30, 65, 0.04)
--shadow-lg:  0 6px 16px -4px rgba(1, 30, 65, 0.07), 0 4px 6px -2px rgba(1, 30, 65, 0.04)
--shadow-xl:  0 12px 32px -8px rgba(1, 30, 65, 0.08), 0 8px 16px -4px rgba(1, 30, 65, 0.03)

/* Hover lift */
--shadow-hover: 0 8px 24px -4px rgba(1, 30, 65, 0.10), 0 4px 8px -2px rgba(1, 30, 65, 0.04)

/* Amber CTA glow */
--shadow-amber-glow: 0 4px 16px rgba(245, 168, 0, 0.20)

/* Never use */
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)  /* ← cold, generic */
```

In Tailwind config, these map to: `shadow-crowe-sm`, `shadow-crowe-md`, `shadow-crowe-lg`, `shadow-crowe-xl`, `shadow-crowe-hover`, `shadow-amber-glow`.

---

## Card Pattern

Cards never have borders. They float on soft shadows.

```css
/* ✅ Correct */
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow:
    0 1px 3px rgba(1, 30, 65, 0.04),
    0 6px 16px rgba(1, 30, 65, 0.04),
    0 12px 32px rgba(1, 30, 65, 0.02);
}

.card:hover {
  box-shadow:
    0 2px 4px rgba(1, 30, 65, 0.06),
    0 8px 24px rgba(1, 30, 65, 0.06),
    0 16px 48px rgba(1, 30, 65, 0.04);
  transform: translateY(-2px);
}

/* ❌ Wrong */
.card {
  background: #ffffff;
  border: 1px solid #E0E0E0;   /* hard border = clinical */
}
```

In Tailwind: `bg-white rounded-xl shadow-crowe-card hover:shadow-crowe-hover hover:-translate-y-0.5 transition-all duration-250`

---

## Border Radius

```css
--radius-sm:   6px     /* Inputs, buttons, chips */
--radius-md:   10px    /* Small cards */
--radius-lg:   12px    /* Standard cards, panels */
--radius-xl:   16px    /* Feature sections, large cards */
--radius-2xl:  20px    /* Hero cards, modals */
--radius-full: 9999px  /* Pills, avatars only */
```

Never use `border-radius: 4px` or less on cards — it reads as sharp and old-fashioned.

---

## The Anti-Patterns Table

If your UI looks wrong, check this first:

| ❌ What you did | ✅ What to do instead |
|---|---|
| `background: #ffffff` as page bg | `background: #f8f9fc` |
| `color: #000000` or `#333333` for text | `color: #2d3142` |
| `border: 1px solid #E0E0E0` on cards | Use `box-shadow` with indigo tint |
| `box-shadow: 0 2px 4px rgba(0,0,0,0.1)` | Use `rgba(1,30,65,0.06)` |
| Hard horizontal `<hr>` dividers | Whitespace + background color shifts |
| `border-radius: 4px` | Minimum `6px`, `12px` for cards |
| Secondary color (teal, violet) for text | `--crowe-tint-900` only |
| Gradient backgrounds | Only on SmartPath device and data charts |
| Large black areas | Use Crowe Indigo Dark instead |
| No spacing between sections | `py-16` to `py-24` minimum |

**The squint test:** Squint at your page. If you see hard horizontal lines, replace them with background-color changes and spacing. If it looks cold or clinical, something has a wrong background or shadow value.

---

## Tailwind Integration

The `tailwind.config.ts` in every project extends Tailwind with all Crowe tokens:

```javascript
colors: {
  crowe: {
    amber: { bright: '#FFD231', DEFAULT: '#F5A800', dark: '#D7761D' },
    indigo: { bright: '#003F9F', DEFAULT: '#002E62', dark: '#011E41' },
    teal: { bright: '#16D9BC', DEFAULT: '#05AB8C', dark: '#0C7876' },
    // ... secondary colors
  },
  tint: {
    950: '#1a1d2b', 900: '#2d3142', 700: '#545968',
    500: '#8b90a0', 300: '#c8cbd6', 200: '#dfe1e8',
    100: '#eef0f4', 50: '#f6f7fa'
  }
}
```

This gives you classes like:
- `bg-crowe-indigo-dark` → `#011E41`
- `text-crowe-amber` → `#F5A800`
- `bg-tint-50` → `#f6f7fa`
- `border-tint-200` → `#dfe1e8`

Use these names in your JSX — don't write raw hex values anywhere in className strings.

---

## shadcn Theme Override

After `shadcn init`, add this to `globals.css` to map shadcn's CSS variables to Crowe tokens:

```css
@layer base {
  :root {
    --background: 225 33% 98%;        /* #f8f9fc */
    --foreground: 228 20% 22%;        /* #2d3142 */
    --card: 225 50% 99%;              /* #fafbfd */
    --card-foreground: 228 20% 22%;
    --primary: 215 98% 13%;           /* Crowe Indigo Dark */
    --primary-foreground: 225 33% 97%;
    --secondary: 39 100% 48%;         /* Crowe Amber */
    --secondary-foreground: 215 98% 13%;
    --muted: 225 20% 96%;
    --muted-foreground: 228 10% 37%;  /* #545968 */
    --accent: 39 100% 48%;
    --destructive: 341 79% 56%;       /* Crowe Coral */
    --border: 226 17% 89%;            /* #dfe1e8 */
    --input: 226 17% 89%;
    --ring: 215 100% 19%;             /* Crowe Indigo Core */
    --radius: 0.75rem;
  }
}
```

Set this once and never touch it again. All shadcn components will be on-brand automatically.

---

## Official Resources

- **Full brand guidelines:** https://www.crowedigitalbrand.com
- **Color system:** https://www.crowedigitalbrand.com/color
- **Typography:** https://www.crowedigitalbrand.com/typography
- **Logo downloads:** https://www.crowedigitalbrand.com/logo
- **Logo files in the project folder:** `crowe-logo.svg` (color) and `crowe-logo-white.svg` (white version for dark backgrounds) are in the root of the VS Code Programming Projects folder and in most project roots
