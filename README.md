# WorldTime

Free, no-account world clock, time-zone converter, and cross-timezone meeting
planner. Add cities, drag a window on the 7-day × 24-hour grid, and read the
red/orange/green heatmap to find a meeting time that works for everyone. State
lives in the browser (localStorage + shareable URLs) — no backend, no tracking.

## Stack

Next.js 15 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS 3 ·
next-intl (11 locales) · Zustand · Luxon · @dnd-kit · next-themes · PWA.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) before building for
production — it drives canonical URLs, sitemap, robots, and share images.

## Verify / build

```bash
npm run type-check # tsc --noEmit
npm run lint       # next lint
npm test           # vitest
npm run build      # next build (standalone output)
npm run gen:brand  # regenerate favicon/OG/brand assets from src/app/icon.svg
```

## Layout

- `src/app/[locale]/` — home grid, `/time/[cityId]`, `/country/[code]`,
  `/time-converter/[slug]`, `/about`, `/faq`, `/privacy`, `/terms`
- `src/lib/` — pure time/grid/heatmap/SEO helpers and hooks
- `src/store/` — Zustand store (places, selection, settings)
- `src/data/` — cities (~1200), countries, holidays, tz abbreviations
- `messages/` — 11 locale files (keys kept aligned by tests)
- `tests/` — Vitest unit tests (pure functions, node env)

See `AGENTS.md` for design context and `markdown/REQUIREMENTS.md` for the
product requirements archive.
