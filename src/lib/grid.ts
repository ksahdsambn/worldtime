import { DateTime } from "luxon";
import { getCountry } from "@/data/countries";

/**
 * 网格相关纯函数。
 *
 * 设计要点（步骤 2.5 / 2.6）：
 * 网格列锚定到"主地点本地"起始日的整点序列，并换算到 UTC 绝对时刻（epoch 毫秒）。
 * 这样：
 * - 列对齐主地点的自然日（便于阅读）；
 * - 每行通过同一 UTC 时刻映射到各地点本地时间，保证所有时区同步对齐。
 */

export interface GridColumn {
  /** 该列对应的绝对时刻（epoch 毫秒），整点。 */
  ms: number;
  /** 该列在主地点本地日历中的小时（0~23）。 */
  homeHour: number;
  /** 该列在主地点本地日历中的日期序号（相对起始日，0 起）。 */
  dayIndex: number;
}

/**
 * 生成网格列。
 * @param homeZone 主地点时区
 * @param startDateMs 起始日（主地点本地）的午夜时刻
 * @param days 天数（默认 7）
 * @returns 列数组，按时间升序
 *
 * 算法（按自然日生成，修复 DST 末尾日截断问题）：
 * 不以固定 `days*24` 为循环上界（那样秋退日 25 小时会把末尾日的 23:00 推出窗口），
 * 而是逐日 `startOf("day").plus({days:d})` 取该日午夜，再在该日内逐小时
 * `plus({hours:1})` 推进，直到跨入次日午夜即停。这样：
 * - 春进日（02:00→03:00 跳过）自动产出 23 列；
 * - 秋退日（01:00 出现两次、offset 不同）自动产出 25 列（Luxon plus 在回退
 *   瞬间产生与首个 01:00 不同 epoch 的第二段，无需特殊处理）；
 * - 普通日 24 列；
 * - 每个自然日都完整覆盖 00:00~23:00，末尾日不会被截断。
 *
 * 每列 ms（epoch）天然唯一：秋退日两段 01:00 的 offset 不同故 epoch 不同，
 * 其余每日本地小时递增 epoch 也不同。dayIndex 直接取自然日序号 d，无歧义。
 */
export function buildColumns(
  homeZone: string,
  startDateMs: number,
  days: number = 7,
): GridColumn[] {
  const columns: GridColumn[] = [];
  // 起始日的本地午夜
  const startLocal = DateTime.fromMillis(startDateMs, { zone: homeZone }).startOf(
    "day",
  );
  // 时区非法时 Luxon 全程返回 invalid（toISODate 均为 null），下方逐小时循环的
  // 跨日判停条件永假会死循环挂起页签——直接返回空列（调用方按无网格处理）
  if (!startLocal.isValid) return columns;
  for (let d = 0; d < days; d++) {
    const dayStart = startLocal.plus({ days: d }).startOf("day");
    const dayIso = dayStart.toISODate();
    let dt = dayStart;
    // 在该自然日内逐小时推进，直到下一小时跨入次日
    while (true) {
      columns.push({
        ms: dt.toMillis(),
        homeHour: dt.hour,
        dayIndex: d,
      });
      const nextHour = dt.plus({ hours: 1 });
      // 用 ISO 日期字符串判断是否跨入次日，避免月份边界时 .day 比较歧义
      if (nextHour.startOf("day").toISODate() !== dayIso) break;
      dt = nextHour;
    }
  }
  return columns;
}

/**
 * 取某起始日（默认今天）在主地点本地日历的午夜时刻。
 */
export function todayStartMs(homeZone: string, now: number = Date.now()): number {
  return DateTime.fromMillis(now, { zone: homeZone }).startOf("day").toMillis();
}

/**
 * 将列的绝对时刻映射到目标地点的本地小时（0~23）。
 */
export function localHourAt(zone: string, ms: number): number {
  return DateTime.fromMillis(ms, { zone }).hour;
}

/**
 * 判断某绝对时刻在目标地点是否处于该地点所在地区的周末（TC-11 / 4.3.2）。
 * @param zone 地点时区
 * @param countryCode 国家代码（用于查 weekendDays）
 * @param ms 绝对时刻
 *
 * Luxon weekday: 1=周一 … 7=周日，与国家 weekendDays 编码一致。
 */
export function isWeekendAt(zone: string, countryCode: string, ms: number): boolean {
  const dt = DateTime.fromMillis(ms, { zone });
  if (!dt.isValid) return false;
  const weekendDays = getCountry(countryCode).weekendDays;
  return weekendDays.includes(dt.weekday);
}
