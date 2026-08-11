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
  let anyValid = false; // 是否存在任一时区有效地点（审查报告 P2：全无效应返回 null）
  for (const p of places) {
    const dt = DateTime.fromMillis(ms, { zone: p.timeZone });
    if (!dt.isValid) continue;
    anyValid = true;
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
  // 所有时区均非法时返回 null（不渲染热力），而非误判为 green
  if (!anyValid) return null;
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

/**
 * 颜色 → 标签（供图例与无障碍）。
 *
 * 重构（国际化扩展）：不再内置中英两套文案，而是接收由调用方从 messages
 * 中取出的已翻译标签映射，任意新增语言无需改动本函数。
 * 注意：生产环境图例 HeatmapLegend 组件已直接使用 useTranslations("Heatmap")，
 * 本函数主要供纯逻辑/测试场景使用。
 */
export function heatLabel(
  color: HeatColor,
  labels: Record<HeatColor, string>,
): string {
  return labels[color];
}

/** 国家代码 → weekendDays（供测试与外部使用）。 */
export function weekendDaysOf(countryCode: string): number[] {
  return getCountry(countryCode).weekendDays;
}
