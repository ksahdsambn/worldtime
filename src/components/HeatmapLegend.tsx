"use client";

import { useTranslations } from "next-intl";

/** 热力图三色图例（无障碍：颜色外附加文字）。 */
export default function HeatmapLegend() {
  const t = useTranslations("Heatmap");
  const items: Array<{ cls: string; key: "green" | "orange" | "red" }> = [
    { cls: "bg-green-300", key: "green" },
    { cls: "bg-orange-300", key: "orange" },
    { cls: "bg-red-300", key: "red" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 px-2 py-1 text-xs text-gray-600">
      {items.map((it) => (
        <span key={it.key} className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded ${it.cls}`} aria-hidden />
          {t(it.key)}
        </span>
      ))}
      <span className="text-gray-400">· {t("worstStatus")}</span>
    </div>
  );
}
