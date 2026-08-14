"use client";

import { useTranslations } from "next-intl";
import { useNow } from "@/lib/useNow";
import { formatOffset } from "@/lib/time";
import {
  buildComparisonState,
  type ComparisonState,
} from "@/lib/landingSlug";
import { Reveal } from "./Reveal";

/**
 * 着陆页时间相关区块（实时版）—— 审查报告 P3 修复。
 *
 * 背景：`time-converter/[slug]` 依赖 ISR（revalidate=3600）烘焙 `Date.now()`，
 * 长尾页的「当前偏移 / 对照表日期」最多滞后 1 小时。现把时间相关 UI 拆为两个
 * 客户端组件（LandingHero / LandingTable），挂载后每分钟用 useNow 重算，
 * 偏移与对照表即实时；服务端仍先渲染 initial（同为 buildComparisonState 产物，
 * 复用同一纯函数输出一致），保证首帧 SSR 与爬虫可见内容不变、无水合差异。
 */
export function LandingHero({
  aZone,
  bZone,
  aLabel,
  bLabel,
  initial,
}: {
  aZone: string;
  bZone: string;
  aLabel: string;
  bLabel: string;
  initial: ComparisonState;
}) {
  const t = useTranslations("Landing");
  const now = useNow(60_000);
  const live = now ? buildComparisonState(now, aZone, bZone) : initial;
  const bAhead = live.diffMinutes >= 0;
  return (
    <>
      <div className="hud-frame shadow-glow mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-6 py-5">
        <span className="text-gradient chrono text-4xl font-bold sm:text-5xl">
          {formatOffset(live.diffMinutes)}
        </span>
        <span className="text-sm text-muted">
          {bLabel} {bAhead ? t("isAhead") : t("lags")} {t("vs")} {aLabel}
        </span>
        <span className="text-xs text-faint">{t("currentOffsetNote")}</span>
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
  initial,
}: {
  aZone: string;
  bZone: string;
  aLabel: string;
  bLabel: string;
  initial: ComparisonState;
}) {
  const t = useTranslations("Landing");
  const now = useNow(60_000);
  const live = now ? buildComparisonState(now, aZone, bZone) : initial;
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
