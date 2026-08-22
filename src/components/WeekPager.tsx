"use client";

import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { IconChevronLeft, IconChevronRight } from "./icons";

/**
 * 周翻页（‹ ›）：以当前窗口起点（未偏移时为今天）为基准 ±7 天。
 * 覆盖「看看下周/上周」这一最高频的日期跳转场景；精确跳转走
 * 视图选项里的日期输入或网格日期表头点击。无地点时禁用。
 */
export default function WeekPager() {
  const t = useTranslations("ViewControls");
  const viewStartDateMs = useWorldTimeStore((s) => s.viewStartDateMs);
  const setViewStartDate = useWorldTimeStore((s) => s.setViewStartDate);
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const home = places.find((p) => p.id === homeId) ?? places[0];

  const disabled = !home;

  function shift(days: number) {
    if (!home) return;
    // 基准：已偏移则用窗口起点；否则今天（主地点本地午夜）
    const base =
      viewStartDateMs ??
      DateTime.fromMillis(Date.now(), { zone: home.timeZone })
        .startOf("day")
        .toMillis();
    const next = DateTime.fromMillis(base, { zone: home.timeZone })
      .plus({ days })
      .startOf("day");
    if (next.isValid) setViewStartDate(next.toMillis());
  }

  const common =
    "icon-btn disabled:cursor-not-allowed disabled:opacity-50 md:!h-7 md:!w-7";
  return (
    <div className="flex items-center" role="group">
      <button
        type="button"
        onClick={() => shift(-7)}
        disabled={disabled}
        aria-label={t("prevWeek")}
        data-testid="week-prev"
        className={common}
      >
        <IconChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => shift(7)}
        disabled={disabled}
        aria-label={t("nextWeek")}
        data-testid="week-next"
        className={common}
      >
        <IconChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
