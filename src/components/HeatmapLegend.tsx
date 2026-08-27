"use client";

import { useTranslations } from "next-intl";

/**
 * 热力图三色图例：色点 + 可见文字（颜色语义不裸靠颜色，WCAG 1.4.1）。
 *
 * 文案复用 Places.periodWork/periodContact/periodRest（工作/可联系/休息时段）：
 * 与 TimeCards 状态行同一套分类词汇（classifyLocalPeriod），且与单元格级
 * 着色语义一致（每格表达该行城市自身的状态）。工具条与帮助弹层共用本形态。
 * 色点为纯装饰（aria-hidden），可见文字即标签，避免读屏重复播报。
 */
export default function HeatmapLegend() {
  const t = useTranslations("Places");
  const items = [
    { token: "var(--heat-good)", label: t("periodWork") },
    { token: "var(--heat-caution)", label: t("periodContact") },
    { token: "var(--heat-bad)", label: t("periodRest") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-0.5 text-[11px] text-muted">
      {items.map((it) => (
        <span key={it.token} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-3.5 shrink-0 rounded-[2px] border border-line"
            style={{ backgroundColor: it.token }}
            aria-hidden
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
