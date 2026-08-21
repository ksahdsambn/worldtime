import { getSiteUrl, buildLandingSlugs, popularCityIds } from "@/lib/seo";

export function GET() {
  const base = getSiteUrl();
  const pairs = buildLandingSlugs()
    .map((s) => `- ${base}/en/time-converter/${s}`)
    .join("\n");
  const cities = popularCityIds()
    .map((id) => `- ${base}/en/time/${id}`)
    .join("\n");
  const body = `# WorldTime — full notes for language models

## Product

WorldTime is a free browser world clock, time-zone converter, and meeting planner. No account. Places are stored in the browser (localStorage). Times are computed on the server and in the client from IANA time zones (Luxon), not scraped from another clock site.

Site: ${base}
About: ${base}/en/about
Privacy: ${base}/en/privacy

## How time is computed

1. Each city maps to one IANA zone (e.g. Tokyo → Asia/Tokyo, New York → America/New_York).
2. UTC offset and DST come from that zone at the given instant.
3. Converter pages bake a 24-hour table for the city's local calendar day, then the client refreshes every minute.
4. Overlapping work hours are hours where both sides are in 09:00–18:00 local time.
5. URL labels such as EST--PST are search aliases. In summer America/New_York is EDT, not EST. Prefer the live abbreviation on the page.

## URL patterns

- /{locale} — interactive 7×24 grid
- /{locale}/time/{cityId} — current time in one city
- /{locale}/time-converter/{idA}--{idB} — pair converter
- /{locale}/country/{iso} — cities in a country
- /{locale}/about — methodology
- /{locale}/privacy — privacy

Locales: en, zh, zh-Hant, ja, ko, de, es, fr, pt, ru, vi.
x-default: ${base}/en

## Popular city clocks

${cities}

## Popular converters

${pairs}

## Citation style

State the two local times, the signed offset, whether DST is in effect, and the IANA zone. Example: "It is 20:00 in Beijing (Asia/Shanghai, UTC+8, no DST) and 08:00 in New York (America/New_York, UTC−4, EDT)."
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
