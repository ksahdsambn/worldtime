"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useTranslations } from "next-intl";
import { decodeState } from "@/lib/shareUrl";
import { decodeEventCode } from "@/lib/calendar";
import { localCityName } from "@/lib/cityName";
import type { AppLocale } from "@/i18n/routing";

/**
 * 事件小组件（第七章 6.2）。
 * 查询参数：code=base64 状态。
 * 城市名随页面 locale 切换。
 *
 * 通过 useEffect + useState 在客户端挂载后读取查询参数，
 * 保证 SSR 与首屏客户端渲染一致（避免水合告警）。
 */
export default function EventWidget({ locale }: { locale: AppLocale }) {
  const t = useTranslations("Event");
  const tw = useTranslations("Widget");
  // null 表示尚未挂载或解析失败，与首屏占位一致
  const [data, setData] = useState<ReturnType<typeof decodeState> | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code") || "";
    try {
      setData(decodeState(decodeEventCode(code)));
    } catch {
      setData(null);
    }
  }, []);

  if (!data || !data.selection) {
    return (
      <div data-testid="event-widget" className="surface p-4 text-sm text-muted">
        {tw("eventEmpty")}
      </div>
    );
  }

  return (
    <div
      data-testid="event-widget"
      className="surface p-4 text-ink"
      style={{ minWidth: 240 }}
    >
      <h2 className="text-gradient mb-2 text-sm font-bold">{t("title")}</h2>
      <ul className="space-y-1 text-sm">
        {data.places.map((p) => {
          const s = DateTime.fromMillis(data.selection!.startMs, { zone: p.timeZone }).toFormat("MM-dd HH:mm");
          const e = DateTime.fromMillis(data.selection!.endMs, { zone: p.timeZone }).toFormat("HH:mm");
          return (
            <li key={p.id} className="flex items-center gap-2">
              <span>{p.flag}</span>
              <span className="flex-1">{localCityName(locale, p)}</span>
              <span className="chrono">{s} - {e}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
