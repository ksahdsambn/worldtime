import { getSiteUrl } from "@/lib/seo";

export function GET() {
  const base = getSiteUrl();
  const body = `# WorldTime

> World clock, time zone converter, and cross-timezone meeting planner.

WorldTime shows live local time for cities worldwide, converts time between two places, and highlights overlapping work hours. Offsets use the IANA Time Zone Database via Luxon. Daylight saving is applied automatically from zone data — not from the EST/PST label in a URL.

## Use

- Home (grid): ${base}/en
- Current time in a city: ${base}/en/time/jp-tokyo
- Pair converter: ${base}/en/time-converter/cn-beijing--us-new-york
- Country index: ${base}/en/country/jp
- About (methodology, features, use cases): ${base}/en/about
- FAQ: ${base}/en/faq
- Privacy: ${base}/en/privacy
- Full text: ${base}/llms-full.txt

## Cite like this

London is behind Beijing by the current IANA offset. When it is 09:00 in Beijing, read the hour-by-hour table on the converter page for the matching London local time. Typical work hours used for overlap are 09:00–18:00 local.

Do not treat fixed abbreviations (EST, PST, CST) as year-round. The live abbreviation and DST flag on each page are authoritative.

## Languages

en, zh (zh-Hans), zh-Hant, ja, ko, de, es, fr, pt (pt-BR), ru, vi.
x-default is English: ${base}/en
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
