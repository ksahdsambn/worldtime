# AGENTS.md — WorldTime

Shared guidance for AI agents working on this project. The **Design Context**
below is durable and should govern all visual, UX, and copy decisions in future
sessions.

---

## Project (orientation)

WorldTime is a world clock, time-zone converter, and cross-timezone meeting
scheduler. Core surface is a 7-day × 24-hour grid with cities/time zones as
rows; users drag to select an overlap window and can overlay Google Calendar
free/busy. Heatmap coloring flags work/sleep/weekend hours so meeting overlap
is legible at a glance.

**Stack:** Next.js 15 (App Router) · React 18 · TypeScript · Tailwind CSS 3 ·
next-intl (**11 locales**: en, zh, zh-Hant, ja, ko, de, es, fr, pt, ru, vi) ·
Zustand · Luxon · @dnd-kit · next-themes · Google Calendar OAuth · PWA.

---

## Design Context

### Users

A **general-purpose** utility — no single persona is prioritized. The same
interface must serve distributed teammates planning a meeting, a traveler
calling home, a consultant juggling client calls, and a curious one-off
visitor. Because the audience is universal, the design must be **immediately
legible to first-time visitors** with no domain knowledge: affordances must be
obvious, jargon avoided, and the path from "add a city → see overlap → pick a
time" must be discoverable in seconds. International by default — 11 languages
including CJK (zh, zh-Hant, ja, ko) and Cyrillic (ru), so the layout must
tolerate **text expansion and non-Latin scripts** without breaking.

### Brand Personality

**Friendly · warm · human.** WorldTime should feel approachable and
encouraging, not clinical or bureaucratic. Microcopy should speak plainly and
warmly ("Add a city", "Looks like a good time for everyone") rather than
coldly. The accent palette leans warm where appropriate (the logo's gold center
dot `#FBBF24` is a hook for warmth). But warmth must never undermine the core
job: this is a precision tool for reading time, so warmth shows up in voice,
spacing, and subtle touches — not in gimmicks that slow experts down.

### Aesthetic Direction

**Polished premium tool** — elevate the existing utilitarian grid into a
refined SaaS feel in the spirit of Linear / Notion: cohesive design tokens,
subtle depth (layered surfaces, restrained shadows), tasteful and purposeful
motion, and consistent spacing/typography rhythm. Both **light and dark themes
are first-class** (dark already uses a slate palette). The current `.dark`
overrides in `globals.css` rely heavily on `!important`; the direction is to
migrate toward a proper **token-based theme system** (semantic CSS variables)
rather than class-override hacks.

**Established brand tokens (keep unless explicitly changed):**
- Primary/accent: **blue-600 `#2563EB`**, with a sky→blue gradient
  (`#38BDF8` → `#2563EB`) in the logo.
- Warm accent hook: **amber/gold `#FBBF24`** (logo center) — use sparingly for
  personality, e.g. "now" indicators, highlights.
- Dark surfaces: slate — bg `#0F172A`, surface `#1E293B`, text `#E5E7EB`.
- Light surfaces: white + gray-50/100; text gray-600–800.
- Heatmap semantic triad: **green** (good overlap), **orange** (caution),
  **red** (asleep/unavailable) at reduced opacity; **blue** for the active
  selection. Note: color must stay redundant with labels/patterns (see
  Accessibility).
- Type: system font stack with CJK fallbacks (PingFang SC, Microsoft YaHei) —
  functional today; a refined SaaS feel may warrant a chosen sans pairing
  later, but keep CJK fallbacks for the 11 locales.

**Anti-references:** avoid a sterile, impersonal data-terminal feel (no
clinical all-gray, no chrome-heavy enterprise density), and avoid gimmicky
playfulness (no heavy illustration, mascots, or motion that delays reading the
grid).

### Design Principles

1. **Clarity over cleverness.** The grid's sole job is to make time-overlap
   legible. Visual hierarchy, alignment, and legibility always beat decoration.
   If an aesthetic choice makes the overlap harder to read, it's wrong.
2. **Warm but never slow.** Friendly voice and warm accents welcome newcomers,
   but the interface must stay fast and precise for power users. Delight is in
   responsiveness and ease, not in extra steps.
3. **Calm density.** Show a lot of information without overwhelming. Whitespace,
   consistent spacing rhythm, and clear grouping carry the load — density
   should feel organized, never cramped.
4. **Accessible by default (WCAG 2.1 AA).** Target AA contrast (≥4.5:1 for body
   text, ≥3:1 for large/UI), full keyboard operability with visible focus,
   proper semantic HTML and ARIA where needed, and **never rely on color alone**
   (the heatmap must stay redundant with labels/patterns/icons so it works for
   color-blind users). Build accessibly from the start; don't retrofit.
5. **Global by design.** 11 locales including CJK and Cyrillic. Design for text
   expansion (EN is often the shortest), keep flexible containers, and verify
   layouts against the widest non-Latin strings — not just English.
