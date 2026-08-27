import { buildColumns, todayStartMs } from "@/lib/grid";
import { placeHeatColor, type HeatColor } from "@/lib/heatmap";
import type { PlaceItem, DayPeriods } from "@/store/useWorldTimeStore";

/** 推荐时段档位：green=全员工作时段；orange=无人休息（有人早/晚的折中）。 */
export type SlotTier = "green" | "orange";

export interface OverlapSlot {
  /** 起始时刻（epoch 毫秒，锚定网格列整点） */
  startMs: number;
  /** 结束时刻（半开区间：末列 ms + 1 小时），与拖拽选区同一约定 */
  endMs: number;
  tier: SlotTier;
}

const HOUR_MS = 3600_000;

/**
 * 在主地点「今天本地午夜起 7 天」窗口内找出全员共同可用的小时窗口（推荐时段）。
 *
 * 与网格着色同源：逐列逐地点调用 placeHeatColor（含周末/假日判红），
 * 推荐结果永远与网格颜色一致。规则：
 * - 每列取全员最差色：green（全员绿）/ orange（无红但非全绿）/ red（任一红）；
 * - 分档合并极大连续段：green 窗口 = 连续「全员绿」列；orange 窗口 = 连续
 *   「橙」列。两档互不包含——若按「无红段整体归档」，同时区城市的全绿
 *   工作段会被前后的可联系段吞并成一个 06:00–22:00 的大橙段，green 永不
 *   出现；分档后 green 核心与 orange 边缘各自成窗，等价于「无红段剔除
 *   全绿段」且互不重叠；
 * - 已过去的小时列（ms + 1h <= now）不参与，进行中的小时保留；推荐以真实
 *   「现在」计算，不受查看时刻（pinnedMs）影响；
 * - 列连续性按数组相邻判定（秋退日重复小时天然不裂段）；
 * - 排序：green 优先、同档按开始时间升序，上限 maxResults（green 不足用
 *   orange 补齐）。
 *
 * 时区非法的地点跳过（与 columnColor 同策略）；places 为空、全部时区非法
 * 或 7 天内无可推时段时返回空数组（UI 走空态文案）。
 */
export function findOverlapSlots(
  places: PlaceItem[],
  dayPeriods: DayPeriods,
  homeZone: string,
  nowMs: number,
  maxResults = 6,
): OverlapSlot[] {
  if (places.length === 0) return [];

  const columns = buildColumns(homeZone, todayStartMs(homeZone, nowMs), 7);

  // 参与判定的列（剔除过去小时列）；每列聚合全员最差色，全部地点时区非法
  // 的列记为 null（视为断点，不参与合并）
  const colStates: Array<{ ms: number; worst: HeatColor | null }> = [];
  for (const c of columns) {
    if (c.ms + HOUR_MS <= nowMs) continue;
    let rank = -1;
    let worst: HeatColor | null = null;
    for (const p of places) {
      const color = placeHeatColor(p.timeZone, p.countryCode, c.ms, dayPeriods);
      if (!color) continue;
      const r = color === "red" ? 2 : color === "orange" ? 1 : 0;
      if (r > rank) {
        rank = r;
        worst = color;
      }
    }
    colStates.push({ ms: c.ms, worst: rank < 0 ? null : worst });
  }

  // 分档合并：同色列的极大连续段即一个窗口（red / null 均为断点）
  const greenSlots: OverlapSlot[] = [];
  const orangeSlots: OverlapSlot[] = [];
  let i = 0;
  while (i < colStates.length) {
    const tier: SlotTier | null =
      colStates[i].worst === "green"
        ? "green"
        : colStates[i].worst === "orange"
          ? "orange"
          : null;
    if (tier === null) {
      i++;
      continue;
    }
    const start = i;
    while (colStates[i].worst === tier) i++;
    const slot: OverlapSlot = {
      startMs: colStates[start].ms,
      endMs: colStates[i - 1].ms + HOUR_MS,
      tier,
    };
    (tier === "green" ? greenSlots : orangeSlots).push(slot);
  }

  const slots = [...greenSlots, ...orangeSlots].sort((a, b) =>
    a.tier === b.tier ? a.startMs - b.startMs : a.tier === "green" ? -1 : 1,
  );
  return slots.slice(0, maxResults);
}
