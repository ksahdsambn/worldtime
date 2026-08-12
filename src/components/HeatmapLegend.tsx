"use client";

import { useTranslations } from "next-intl";

/** 热力图三色图例（无障碍：颜色外附加文字）。色块直接复用网格令牌，所见即所得。 */
export default function HeatmapLegend() {
  const t = useTranslations("Heatmap");
  const items: Array<{ key: "green" | "orange" | "red"; token: string }> = [
    { key: "green", token: "var(--heat-good)" },
    { key: "orange", token: "var(--heat-caution)" },
    { key: "red", token: "var(--heat-bad)" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-0.5 text-[11px] text-muted">
      {items.map((it) => (
        <span key={it.key} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-line"
            style={{ backgroundColor: it.token }}
            aria-hidden
          />
          {t(it.key)}
        </span>
      ))}
      <span className="text-faint">· {t("worstStatus")}</span>
    </div>
  );
}
