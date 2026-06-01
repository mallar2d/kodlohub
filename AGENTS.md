# KodloHUB — Agent Rules

## Project layout

```
lpds/                  ← git root (contains DESIGN.md, agent.md)
  kodlohost/            ← Next.js 16 app — ALL code, commits, and commands live here
    app/                ← App Router pages + API routes
    components/         ← Reusable UI + layout
    lib/                ← Supabase clients, R2 utils
    public/             ← Static assets (PDR_PRODUCTION_SOUND.mp3, etc.)
    supabase/migrations ← SQL migrations
```

**Working directory for all commands: `kodlohost/`.**

## Commands

```bash
cd kodlohost
npm run build    # verify build — run after every change
npm run lint     # eslint (next core-web-vitals + typescript)
npm run dev      # dev server
```

No `typecheck` or `tsc` script exists — `npm run build` covers type errors.

## Commits

Make commits from inside `kodlohost/`. Stage only intended files, never secrets.

**NEVER commit or push in the parent repo (`lpds/`). Only `kodlohost/` is the working project.**

## Framework quirks

- **Next.js 16** — has breaking changes from earlier versions. If unsure about an API, check `node_modules/next/dist/docs/` first.
- **React 19** — `use()` is available; server components can be async.
- **Tailwind CSS 4** — theme defined via `@theme inline` in `globals.css`, NOT `tailwind.config`. Use utility classes like `bg-canvas-night`, `text-on-primary`, `border-hairline-dark`.
- **Path alias**: `@/*` maps to project root (kodlohost/).
- **`searchParams`** in page components is a `Promise` — must be `await`ed.

## Data patterns

- Server pages: fetch with `unstable_cache` + `createAdminClient()` (Supabase service role), pass to client component.
- Client components: `"use client"` directive, use `createClient()` (browser Supabase client).
- Auth: Google OAuth via Supabase. Roles: `owner` > `podrofikovany` > `kodlo` > `shemetovany`.

## Design system

SpaceX-inspired. See `DESIGN.md` for full spec.

- **Canvas**: `#000000` (night), `#0a0a0a` (night-soft), `#ffffff` (light).
- **Typography**: Inter (substitute for D-DIN). Display = uppercase, bold, positive tracking.
- **CSS classes**: `heading-hero/section/sub`, `btn-ghost`, `card-dark/card-light`, `micro-cap`, `button-cap`, `caption`.
- **Page wrapper**: `min-h-screen pt-24 pb-16 px-4 sm:px-6` with `max-w-[1200px] mx-auto`.
- **Section headers**: `micro-cap text-ink-mute mb-2` eyebrow + `heading-section mb-4` title.
- **Cards**: `card-dark` with `hover:border-on-primary-mute transition-colors`.
- **Buttons**: `btn-ghost text-on-primary` (universal CTA).

## Sensitive files — DO NOT commit

- `bot_token`
- `databasepass.txt`
- `.env.local`

## Key files

- `app/globals.css` — theme tokens, CSS component classes, responsive breakpoints
- `components/layout/Navbar.tsx` — nav links array, auth state, mobile menu
- `components/layout/Footer.tsx` — site footer
- `app/layout.tsx` — root layout (Navbar, Footer, providers)
