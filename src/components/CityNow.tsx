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
    <div className="hud-frame shadow-glow mt-5 px-6 py-5">
      <p className="chrono text-5xl font-bold tracking-tight text-gradient sm:text-6xl">
        {facts.time}
      </p>
      <p className="mt-2 text-sm text-muted">{facts.date}</p>
      <p className="mt-1 text-sm text-muted">
        UTC {facts.offsetLabel}
        {facts.abbrev ? ` · ${facts.abbrev}` : ""}
      </p>
      <p className="mt-2 text-sm text-muted">{dstText}</p>
      {nextText ? <p className="mt-1 text-xs text-faint">{nextText}</p> : null}
    </div>
  );
}
