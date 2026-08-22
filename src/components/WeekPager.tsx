"use client";

import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { IconChevronLeft, IconChevronRight } from "./icons";

/**
 * 网格翻页（‹ ›）：以当前窗口起点（未偏移时为今天）为基准，按当前窗口
 * 跨度步进——1 天视图 ±1 天、7 天视图 ±7 天。覆盖「看看明天/下周」这一
 * 最高频的日期跳转场景；精确跳转走网格日期表头点击。无地点时禁用。
 */
export default function WeekPager() {
  const t = useTranslations("ViewControls");
  const viewStartDateMs = useWorldTimeStore((s) => s.viewStartDateMs);
  const setViewStartDate = useWorldTimeStore((s) => s.setViewStartDate);
  const gridDays = useWorldTimeStore((s) => s.gridDays);
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const home = places.find((p) => p.id === homeId) ?? places[0];

  const disabled = !home;

  function shift(dir: 1 | -1) {
    if (!home) return;
    // 基准：已偏移则用窗口起点；否则今天（主地点本地午夜）
    const base =
      viewStartDateMs ??
      DateTime.fromMillis(Date.now(), { zone: home.timeZone })
        .startOf("day")
        .toMillis();
    const next = DateTime.fromMillis(base, { zone: home.timeZone })
      .plus({ days: dir * gridDays })
      .startOf("day");
    if (next.isValid) setViewStartDate(next.toMillis());
  }

  const common =
    "icon-btn disabled:cursor-not-allowed disabled:opacity-50 md:!h-7 md:!w-7";
  return (
    // 不加 role="group"：常驻命中 KeyboardShortcuts 的 Esc 守卫（视为浮层打开），
    // 会永久短路 Esc 清选区；两按钮各自 aria-label 已足够。
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => shift(-1)}
        disabled={disabled}
        aria-label={t("prev")}
        data-testid="week-prev"
        className={common}
      >
        <IconChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => shift(1)}
        disabled={disabled}
        aria-label={t("next")}
        data-testid="week-next"
        className={common}
      >
        <IconChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
