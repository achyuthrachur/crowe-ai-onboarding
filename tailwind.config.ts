/**
 * tailwind.config.ts — Crowe Brand Token Reference
 *
 * NOTE: This project uses Tailwind CSS v4.
 * In Tailwind v4, theme tokens are configured via @theme in CSS (globals.css),
 * NOT in this file. This file exists as a reference artifact so that token
 * values are searchable and documented in a familiar format.
 *
 * The ACTUAL working tokens live in src/app/globals.css (@theme block).
 * Class names like bg-crowe-indigo-dark, text-crowe-amber, shadow-crowe-card
 * are generated from globals.css, not from this file.
 *
 * Source: CLAUDE.md Section 2.2 — all values copied VERBATIM.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        crowe: {
          amber: {
            bright: '#FFD231',
            DEFAULT: '#F5A800',
            dark: '#D7761D',
          },
          indigo: {
            bright: '#003F9F',
            DEFAULT: '#002E62',
            dark: '#011E41',
          },
          teal: { bright: '#16D9BC', DEFAULT: '#05AB8C', dark: '#0C7876' },
          cyan: { light: '#8FE1FF', DEFAULT: '#54C0E8', dark: '#007DA3' },
          blue: { light: '#32A8FD', DEFAULT: '#0075C9', dark: '#0050AD' },
          violet: { bright: '#EA80FF', DEFAULT: '#B14FC5', dark: '#612080' },
          coral: { bright: '#FF526F', DEFAULT: '#E5376B', dark: '#992A5C' },
        },
        tint: {
          950: '#1a1d2b',
          900: '#2d3142',
          700: '#545968',
          500: '#8b90a0',
          300: '#c8cbd6',
          200: '#dfe1e8',
          100: '#eef0f4',
          50:  '#f6f7fa',
        },
      },
      fontFamily: {
        display: ['Helvetica Now Display', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
        body:    ['Helvetica Now Text',    'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'crowe-sm':    '0 1px 3px rgba(1,30,65,0.06), 0 1px 2px rgba(1,30,65,0.04)',
        'crowe-md':    '0 4px 8px -2px rgba(1,30,65,0.06), 0 2px 4px -1px rgba(1,30,65,0.04)',
        'crowe-lg':    '0 6px 16px -4px rgba(1,30,65,0.07), 0 4px 6px -2px rgba(1,30,65,0.04)',
        'crowe-xl':    '0 12px 32px -8px rgba(1,30,65,0.08), 0 8px 16px -4px rgba(1,30,65,0.03)',
        'crowe-hover': '0 8px 24px -4px rgba(1,30,65,0.10), 0 4px 8px -2px rgba(1,30,65,0.04)',
        'crowe-card':  '0 1px 3px rgba(1,30,65,0.04), 0 6px 16px rgba(1,30,65,0.04), 0 12px 32px rgba(1,30,65,0.02)',
        'amber-glow':  '0 4px 16px rgba(245,168,0,0.20)',
      },
      backgroundColor: {
        page:            '#f8f9fc',
        section:         '#f6f7fa',
        'section-warm':  '#f0f2f8',
        'section-amber': '#fff8eb',
      },
    },
  },
  plugins: [],
};

export default config;
