import { DateTime } from "luxon";
import type { PlaceItem } from "@/store/useWorldTimeStore";
import type { DayPeriods } from "@/store/useWorldTimeStore";
import { classifyLocalPeriod, type LocalPeriod } from "@/lib/time";
import { isWeekendAt } from "@/lib/grid";
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

/** 颜色 → 优先级值（与 periodRank 对偶，供聚合最差状态用）。 */
function colorRank(c: HeatColor): number {
  return c === "red" ? 2 : c === "orange" ? 1 : 0;
}

/**
 * 计算单个地点在某绝对时刻的热力颜色（单元格级语义）。
 *
 * 重构（首页两态改造）：热力从「整列取全员最差」改为「每格表达该地点自身的
 * 状态」——城市跨度大时（如 ±12h）几乎每列都有人在睡觉，列级最差色会让整个
 * 网格一片红、失去信息量；单元格级着色让每一行独立可读。
 *
 * 算法：
 * 1. 该时刻处于其地区周末 -> 休息（覆盖）；
 * 2. 处于其地区公共假日 -> 休息（覆盖，MS-7）；
 * 3. 否则按本地小时所属时段判定。
 *
 * 时区非法时返回 null（不渲染热力）。
 */
export function placeHeatColor(
  zone: string,
  countryCode: string,
  ms: number,
  periods: DayPeriods,
): HeatColor | null {
  const dt = DateTime.fromMillis(ms, { zone });
  if (!dt.isValid) return null;
  // 周末覆盖（4.3.2 P0）：该地点处于其地区周末 -> 视为休息
  if (isWeekendAt(zone, countryCode, ms)) return "red";
  // 节假日覆盖（4.3.2 P1，MS-7）：公共假日 -> 视为休息
  if (isHoliday(countryCode, dt.toFormat("yyyy-MM-dd"))) return "red";
  return rankToColor(periodRank(classifyLocalPeriod(dt.hour, periods)));
}

/**
 * 计算某一列（绝对时刻）下所有地点的最差状态颜色。
 *
 * 现状：网格已改为单元格级 placeHeatColor 着色；本函数保留为「汇总视角」
 * 纯逻辑（供测试与潜在的小部件复用），不再被 TimeGrid 消费。
 *
 * @param places 所有地点
 * @param ms 绝对时刻
 * @param periods 时段定义（可配置）
 * @returns 全员最差状态色；地点列表为空或全部时区非法时返回 null
 */
export function columnColor(
  places: PlaceItem[],
  ms: number,
  periods: DayPeriods,
): HeatColor | null {
  if (places.length === 0) return null;
  let worst = -1; // -1 表示尚无有效地点
  for (const p of places) {
    const c = placeHeatColor(p.timeZone, p.countryCode, ms, periods);
    if (!c) continue; // 时区非法的地点跳过
    worst = Math.max(worst, colorRank(c));
  }
  // 所有时区均非法时返回 null（不渲染热力），而非误判为 green
  if (worst < 0) return null;
  return rankToColor(worst);
}

/** 颜色 → 半透明背景类（用于单元格叠加）。
 *
 * 已废弃：单元格背景现由 globals.css 中基于 data-heat 属性的令牌化规则直接渲染
 * （见 `.wt-grid td[data-heat]`），不再需要把颜色映射成 Tailwind 类名。
 * 保留类型与算法（columnColor），仅移除该 UI 耦合的映射函数。
 */

/**
 * 颜色 → 标签（供无障碍文案）。
 *
 * 重构（国际化扩展）：不再内置中英两套文案，而是接收由调用方从 messages
 * 中取出的已翻译标签映射，任意新增语言无需改动本函数。
 * 注意：生产图例 HeatmapLegend 组件已改用 useTranslations("Places") 的
 * 时段键（与 TimeCards 状态行同词汇）；本函数仅测试场景使用。
 */
export function heatLabel(
  color: HeatColor,
  labels: Record<HeatColor, string>,
): string {
  return labels[color];
}
