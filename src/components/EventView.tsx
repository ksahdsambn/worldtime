"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { Link } from "@/i18n/navigation";
import { decodeState, encodeState } from "@/lib/shareUrl";
import { decodeEventCode } from "@/lib/calendar";
import { localCityName } from "@/lib/cityName";
import { IconHome } from "./icons";
import { StateSurface } from "./StateSurface";
import type { AppLocale } from "@/i18n/routing";

/**
 * 公开事件视图（MS-5）：解析 base64 状态，展示事件在各地时区的对应时间。
 * 城市名随页面 locale 切换（中文页显示中文名，其余语言显示英文名）。
 *
 * 视觉：事件时间是本页最关键的信息，用 ink + 等宽 tabular-nums 高对比呈现
 * （旧实现把时间放在 text-faint，对比度不足 WCAG AA）。各地时间以卡片行列表
 * 呈现，主地点（home）用暖色 ⌂ 标注，与主应用地点行保持一致语义。
 */
export default function EventView({
  code,
  locale,
}: {
  code: string;
  locale: AppLocale;
}) {
  const t = useTranslations("Event");

  const data = useMemo(() => {
    try {
      // code 为 URL 安全 base64（可能缺 padding），补齐后解析为查询串
      return decodeState(decodeEventCode(code));
    } catch {
      // 兼容直接以查询串编码的情况
      try {
        return decodeState(code);
      } catch {
        return null;
      }
    }
  }, [code]);

  if (!data || !data.selection || data.places.length === 0) {
    return <StateSurface icon={<span>📅</span>} title={t("invalid")} className="min-h-[50vh]" />;
  }

  const sel = data.selection;
  // 为主地点排序到首位（基准）：未指定 homeId 时退回原顺序
  const ordered = [...data.places].sort((a, b) => {
    if (a.id === data.homeId) return -1;
    if (b.id === data.homeId) return 1;
    return 0;
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <header className="animate-fade-up mb-5 space-y-1.5">
        <h1 className="text-lg font-bold text-gradient">{t("title")}</h1>
        <p className="text-sm text-muted">{t("description")}</p>
      </header>

      <ul className="surface-glass stagger overflow-hidden p-0">
        {ordered.map((p) => {
          const sDt = DateTime.fromMillis(sel.startMs, { zone: p.timeZone });
          const eDt = DateTime.fromMillis(sel.endMs, { zone: p.timeZone });
          const timeRange = `${sDt.toFormat("HH:mm")}–${eDt.toFormat("HH:mm")}`;
          const dateStr = sDt.toFormat("ccc, dd LLL");
          const tzAbbr = sDt.toFormat("ZZZZ");
          const isHome = p.id === data.homeId;
          return (
            <li
              key={p.id}
              className={`animate-fade-up flex items-center gap-3 px-4 py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line ${
                isHome ? "home-row" : ""
              }`}
            >
              <span className="text-xl leading-none" aria-hidden>
                {p.flag}
              </span>
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  {isHome && (
                    <IconHome aria-hidden className="h-3.5 w-3.5 shrink-0 text-warm-strong" />
                  )}
                  <span className="truncate text-sm font-medium text-ink">
                    {localCityName(locale, p)}
                  </span>
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end leading-tight">
                <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                  {timeRange}
                </span>
                <span className="text-[11px] text-muted tabular-nums">
                  {dateStr} · {tzAbbr}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {(() => {
        const q = encodeState(data.places, data.homeId, sel);
        // i18n Link 会自动补 locale 前缀；href 仅给 pathname + 查询串。
        return (
          <Link href={q ? `/?${q}` : "/"} className="btn-primary btn-sm mt-5">
            {t("openOriginal")}
          </Link>
        );
      })()}
    </main>
  );
}
