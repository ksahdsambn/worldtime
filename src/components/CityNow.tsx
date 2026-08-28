"use client";

import { useNow } from "@/lib/useNow";
import { buildCityNowFacts } from "@/lib/cityFacts";
import { formatDstDate } from "@/lib/landingSlug";

export default function CityNow({
  timeZone,
  locale,
  initialMs,
  dstYes,
  dstNo,
  noDst,
  nextDstLabel,
}: {
  timeZone: string;
  locale: string;
  initialMs: number;
  dstYes: string;
  dstNo: string;
  noDst: string;
  nextDstLabel: string;
}) {
  const now = useNow(60_000);
  const ms = now ?? initialMs;
  const facts = buildCityNowFacts(timeZone, ms, locale);
  const dstText = !facts.nextDstMs && !facts.inDst
    ? noDst
    : facts.inDst
      ? dstYes
      : dstNo;
  const nextText = facts.nextDstMs
    ? nextDstLabel.replaceAll("{date}", formatDstDate(facts.nextDstMs, timeZone, locale))
    : null;
  return (
    <div className="hud-frame shadow-glow mt-6 px-6 py-7 sm:px-8 sm:py-8">
      <p className="chrono text-6xl font-medium tracking-tight text-gradient sm:text-7xl">
        {facts.time}
      </p>
      <p className="mt-3 text-sm text-muted">{facts.date}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span className="live-dot" aria-hidden />
        <span className="chrono">UTC {facts.offsetLabel}</span>
        {facts.abbrev ? <span>· {facts.abbrev}</span> : null}
      </p>
      <p className="mt-3 text-sm text-muted">{dstText}</p>
      {nextText ? <p className="mt-1 text-xs text-faint">{nextText}</p> : null}
    </div>
  );
}
