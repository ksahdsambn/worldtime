"use client";

import { useTranslations } from "next-intl";

/**
 * 热力图三色图例。
 *
 * 默认紧凑形态：只渲染 3 个色点，完整语义放 title/aria-label——
 * 工具条不再占用一行文字，颜色语义在 Help 弹窗里有全量图文说明。
 * `labels` 形态供 HelpPopover 使用：色点降为装饰（aria-hidden），
 * 文字标签承载语义，避免读屏把同一语义播报两遍。
 */
export default function HeatmapLegend({ labels = false }: { labels?: boolean }) {
  const t = useTranslations("Heatmap");
  const items: Array<{ key: "green" | "orange" | "red"; token: string }> = [
    { key: "green", token: "var(--heat-good)" },
    { key: "orange", token: "var(--heat-caution)" },
    { key: "red", token: "var(--heat-bad)" },
  ];

  if (labels) {
    return (
      <div className="space-y-1.5 text-[11px] text-muted">
        {items.map((it) => (
          <span key={it.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-3.5 shrink-0 rounded-[2px] border border-line"
              style={{ backgroundColor: it.token }}
              aria-hidden
            />
            {t(it.key)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-0.5 text-[11px] text-muted">
      {items.map((it) => (
        <span
          key={it.key}
          className="inline-block h-2 w-3.5 rounded-[2px] border border-line"
          style={{ backgroundColor: it.token }}
          title={t(it.key)}
          aria-label={t(it.key)}
        />
      ))}
    </div>
  );
}
