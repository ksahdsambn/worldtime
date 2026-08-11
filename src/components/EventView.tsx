"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { Link } from "@/i18n/navigation";
import { decodeState, encodeState } from "@/lib/shareUrl";
import { decodeEventCode } from "@/lib/calendar";
import { localCityName } from "@/lib/cityName";
import type { AppLocale } from "@/i18n/routing";

/**
 * 公开事件视图（MS-5）：解析 base64 状态，展示事件在各地时区的对应时间。
 * 城市名随页面 locale 切换（中文页显示中文名，其余语言显示英文名）。
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
    return (
      <main className="p-6 text-sm text-gray-600">
        {t("description")}
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-lg font-bold">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("description")}</p>

      <ul className="mt-4 space-y-2">
        {data.places.map((p) => {
          const s = DateTime.fromMillis(data.selection!.startMs, {
            zone: p.timeZone,
          }).toFormat("yyyy-MM-dd HH:mm (ZZZZ)");
          const e = DateTime.fromMillis(data.selection!.endMs, {
            zone: p.timeZone,
          }).toFormat("HH:mm (ZZZZ)");
          return (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="text-lg">{p.flag}</span>
              <span className="font-medium">{localCityName(locale, p)}</span>
              <span className="text-gray-500">
                {s} - {e}
              </span>
            </li>
          );
        })}
      </ul>

      {(() => {
        const q = encodeState(data.places, data.homeId, data.selection);
        // i18n Link 会自动补 locale 前缀；href 仅给 pathname + 查询串。
        return (
          <Link
            href={q ? `/?${q}` : "/"}
            className="mt-4 inline-block rounded border px-3 py-1 text-xs hover:bg-gray-100"
          >
            {t("openOriginal")}
          </Link>
        );
      })()}
    </main>
  );
}
