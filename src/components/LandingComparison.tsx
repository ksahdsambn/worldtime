"use client";

import { useTranslations } from "next-intl";
import { useNow } from "@/lib/useNow";
import { formatOffset } from "@/lib/time";
import {
  buildComparisonState,
  type ComparisonState,
} from "@/lib/landingSlug";
import { Reveal } from "./Reveal";

export function LandingHero({
  aZone,
  bZone,
  aLabel,
  bLabel,
  locale,
  initial,
}: {
  aZone: string;
  bZone: string;
  aLabel: string;
  bLabel: string;
  locale: string;
  initial: ComparisonState;
}) {
  const t = useTranslations("Landing");
  const now = useNow(60_000);
  const live = now ? buildComparisonState(now, aZone, bZone, locale) : initial;
  const bAhead = live.diffMinutes >= 0;
  return (
    <>
      <p className="mt-4 text-base leading-relaxed text-ink">
        {t("factLead", { a: aLabel, b: bLabel, aTime: live.aNow, bTime: live.bNow })}
      </p>
      <div className="hud-frame shadow-glow mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-6 py-5">
        <span className="text-gradient chrono text-4xl font-bold sm:text-5xl">
          {formatOffset(live.diffMinutes)}
        </span>
        <span className="text-sm text-muted">
          {bLabel} {bAhead ? t("isAhead") : t("lags")} {t("vs")} {aLabel}
        </span>
        <span className="text-xs text-faint">{t("currentOffsetNote")}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-6 text-sm">
        <p>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
            {aLabel}
          </span>
          <span className="chrono text-2xl font-semibold text-ink">{live.aNow}</span>
        </p>
        <p>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
            {bLabel}
          </span>
          <span className="chrono text-2xl font-semibold text-ink">{live.bNow}</span>
        </p>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        {t("bNote", {
          b: bLabel,
          a: aLabel,
          dir: t(bAhead ? "aheadNote" : "behindNote"),
        })}
      </p>
    </>
  );
}

export function LandingTable({
  aZone,
  bZone,
  aLabel,
  bLabel,
  locale,
  initial,
}: {
  aZone: string;
  bZone: string;
  aLabel: string;
  bLabel: string;
  locale: string;
  initial: ComparisonState;
}) {
  const t = useTranslations("Landing");
  const now = useNow(60_000);
  const live = now ? buildComparisonState(now, aZone, bZone, locale) : initial;
  return (
    <Reveal className="mt-10">
      <section>
        <h2 className="mb-1 text-base font-semibold text-gradient">
          {t("timeComparison")}
        </h2>
        <p className="mb-3 text-xs text-muted">{t("comparisonNote")}</p>
        <div className="hud-frame overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong">
                <th
                  scope="col"
                  className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted"
                >
                  {aLabel}
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted"
                >
                  {bLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {live.rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-surface-hover"
                >
                  <td className="chrono px-4 py-2.5 text-ink">{r.aHour}</td>
                  <td className="chrono px-4 py-2.5 text-ink">
                    {r.bHour} <span className="text-faint">({r.bDay})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          {t("updatedAt", { time: live.updatedAt })}
        </p>
      </section>
    </Reveal>
  );
}
