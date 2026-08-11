import { DateTime } from "luxon";
import type { PlaceItem } from "@/store/useWorldTimeStore";
import type { DayPeriods } from "@/store/useWorldTimeStore";
import { classifyLocalPeriod, type LocalPeriod } from "@/lib/time";
import { isWeekendAt } from "@/lib/grid";
import { getCountry } from "@/data/countries";
import { isHoliday } from "@/data/holidays";

/**
 * 热力图配色（MS-1 / 需求 4.3.1 / 4.3.2）。
 *
 * 列颜色 = 该列下所有地点的"最差状态"，优先级：休息 > 可联系 > 工作。
 * 周末覆盖（4.3.2 P0）：地点处于其地区周末时，该列对其视为休息状态。
 */
export type HeatColor = "green" | "orange" | "red";

/** 把本地时段类型映射为数值优先级，越大越差。 */
function periodRank(p: LocalPeriod): number {
  return p === "rest" ? 2 : p === "contact" ? 1 : 0;
}

/** 优先级值 → 颜色。 */
function rankToColor(rank: number): HeatColor {
  if (rank >= 2) return "red";
  if (rank === 1) return "orange";
  return "green";
}

/**
 * 计算某一列（绝对时刻 ms）的热力图颜色。
 * @param places 所有地点
 * @param ms 列对应的绝对时刻
 * @param periods 时段定义（可配置）
 *
 * 算法：
 * 1. 对每个地点，判定该时刻其本地小时所属时段；
 * 2. 若该地点处于其地区周末，强制视为休息（覆盖）；
 * 3. 取所有地点中最高优先级（最差状态）作为该列颜色。
 *
 * 地点列表为空时返回 null（不渲染热力）。
 */
export function columnColor(
  places: PlaceItem[],
  ms: number,
  periods: DayPeriods,
): HeatColor | null {
  if (places.length === 0) return null;
  let worst = 0; // 全工作起步
  for (const p of places) {
    const dt = DateTime.fromMillis(ms, { zone: p.timeZone });
    if (!dt.isValid) continue;
    // 周末覆盖（4.3.2 P0）：该地点处于其地区周末 -> 视为休息
    if (isWeekendAt(p.timeZone, p.countryCode, ms)) {
      worst = Math.max(worst, periodRank("rest"));
      continue;
    }
    // 节假日覆盖（4.3.2 P1，MS-7）：该地点处于公共假日 -> 视为休息
    const isoDate = dt.toFormat("yyyy-MM-dd");
    if (isHoliday(p.countryCode, isoDate)) {
      worst = Math.max(worst, periodRank("rest"));
      continue;
    }
    const period = classifyLocalPeriod(dt.hour, periods);
    worst = Math.max(worst, periodRank(period));
  }
  return rankToColor(worst);
}

/** 颜色 → 半透明 Tailwind 背景类（用于单元格叠加）。 */
export function heatBg(color: HeatColor | null): string {
  switch (color) {
    case "green":
      return "bg-green-200/60";
    case "orange":
      return "bg-orange-200/60";
    case "red":
      return "bg-red-200/60";
    default:
      return "";
  }
}

/** 颜色 → 中文/英文标签（供图例与无障碍）。 */
export function heatLabel(color: HeatColor, locale: "zh" | "en"): string {
  const zh = { green: "全员工作时段", orange: "有人可联系", red: "有人休息" };
  const en = { green: "All working", orange: "Some contactable", red: "Someone resting" };
  return locale === "zh" ? zh[color] : en[color];
}

/** 国家代码 → weekendDays（供测试与外部使用）。 */
export function weekendDaysOf(countryCode: string): number[] {
  return getCountry(countryCode).weekendDays;
}
