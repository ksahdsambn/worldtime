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
 * 注意：必须保证每列的 ms（epoch）唯一。若按「日 × 小时」双重循环用
 * `plus({days:d, hours:h})`，在 DST 春进日（本地 02:00→03:00 被跳过）会出现
 * 该日 h=23 与次日 h=0 落到同一 epoch，导致 React key 重复、热力图色错位。
 * 故改为从单一起点逐小时累加，并按 ms 去重，确保每列唯一。
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
  const totalHours = days * 24;
  // dayIndex 按该列本地日期相对起始日的差计算，而非循环计数器，
  // 以正确反映 DST 推移导致的「该日实际跨入的本地日期」。
  const seenMs = new Set<number>();
  for (let i = 0; i < totalHours; i++) {
    const dt = startLocal.plus({ hours: i });
    const ms = dt.toMillis();
    // 去重（理论上不应重复，防御 DST 边界）
    if (seenMs.has(ms)) continue;
    seenMs.add(ms);
    columns.push({
      ms,
      homeHour: dt.hour,
      dayIndex: Math.floor(
        dt.diff(startLocal.startOf("day"), "days").days,
      ),
    });
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
