import { DateTime } from "luxon";
import type { DayPeriods } from "@/store/useWorldTimeStore";
import { DEFAULT_DAY_PERIODS } from "@/store/useWorldTimeStore";

/**
 * 时间相关纯函数工具集。
 * 全部基于 Luxon，自动处理 IANA 时区与 DST。
 * 这些函数刻意设计为可在服务端与客户端运行（无 DOM 依赖）。
 */

/** 判断指定地点在某绝对时刻是否处于夏令时。 */
export function isDST(timeZone: string, ms: number = Date.now()): boolean {
  const dt = DateTime.fromMillis(ms, { zone: timeZone });
  if (!dt.isValid) return false;
  return dt.isInDST;
}

/**
 * 计算某时区从 fromMs 起，下一次 DST 切换的时刻（epoch 毫秒）。
 * 逐月探测 isInDST 的变化点，再在变化月内逐日逼近。
 * 返回 null 表示一年内未检测到切换。
 *
 * 注意：DST 切换发生在本地凌晨 02:00 前后（春进 02:00→03:00、秋退 02:00→01:00），
 * 若以本地午夜（00:00）探测 isInDST，切换日午夜尚未翻转，会误判为「次日」。
 * 故逐日探测固定取当日 12:00（午后，必在切换之后），确保返回切换发生日。
 */
export function nextDSTChange(
  timeZone: string,
  fromMs: number = Date.now(),
  maxMonths: number = 12,
): number | null {
  const start = DateTime.fromMillis(fromMs, { zone: timeZone });
  let dt = start.startOf("month");
  // 以正午时刻判定 DST 状态，规避「午夜尚未翻转」导致的偏后一天。
  const prevDST = start.startOf("day").plus({ hours: 12 }).isInDST;
  for (let i = 0; i < maxMonths; i++) {
    const next = dt.plus({ months: 1 });
    const nextDST = next.plus({ hours: 12 }).isInDST;
    if (nextDST !== prevDST) {
      // 在该月内逐日逼近（取正午探测）
      let loDST = prevDST;
      for (let d = 0; d < 31; d++) {
        const day = dt.plus({ days: d, hours: 12 });
        if (day.isInDST !== loDST) {
          return day.startOf("day").toMillis();
        }
      }
      return next.toMillis();
    }
    dt = next;
  }
  return null;
}

/** 下一次 DST 切换是否在 days 天内（用于 DST 预警 6.3）。返回切换时刻或 null。 */
export function dstChangeWithinDays(
  timeZone: string,
  days: number,
  fromMs: number = Date.now(),
): number | null {
  const next = nextDSTChange(timeZone, fromMs);
  if (next == null) return null;
  const diff = next - fromMs;
  if (diff > 0 && diff <= days * 24 * 3600_000) return next;
  return null;
}

/** 取地点在某绝对时刻的 UTC 偏移分钟数（东为正）。 */
export function offsetMinutes(timeZone: string, ms: number = Date.now()): number {
  const dt = DateTime.fromMillis(ms, { zone: timeZone });
  if (!dt.isValid) return 0;
  return dt.offset;
}

/**
 * 计算两个时区在同一绝对时刻的偏移差（分钟），target 相对 home。
 * 例：home=北京(+8)，target=纽约(-5)，差 = -13h（纽约落后）。
 */
export function diffOffsetMinutes(
  homeZone: string,
  targetZone: string,
  ms: number = Date.now(),
): number {
  return offsetMinutes(targetZone, ms) - offsetMinutes(homeZone, ms);
}

/** 将偏移分钟数格式化为 "+8 / -5 / +5:30" 风格（用于显示偏移量）。 */
export function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}` : `${sign}${h}:${String(m).padStart(2, "0")}`;
}

/**
 * 三类本地时段类型（4.3.1 配色规则）。
 */
export type LocalPeriod = "work" | "contact" | "rest";

/**
 * 判定某地点在给定本地小时所属的时段类型。
 * @param localHour 0~23 本地小时
 * @param periods 时段定义
 *
 * 规则（默认值）：
 * - 工作：9 ≤ h < 18
 * - 可联系：6 ≤ h < 9 或 18 ≤ h < 22
 * - 休息：22 ≤ h 或 h < 6（读取 periods.rest，支持跨午夜）
 *
 * 三类时段均可由用户在设置中调整（需求 4.3.1）；判定顺序为
 * 工作 > 可联系 > 休息（显式读取 rest 区间，确保配置后三类一致）。
 */
export function classifyLocalPeriod(
  localHour: number,
  periods: DayPeriods = DEFAULT_DAY_PERIODS,
): LocalPeriod {
  // 工作时段：连续区间
  if (inRange(localHour, periods.work.start, periods.work.end)) return "work";
  // 可联系时段：可能两段
  for (const seg of periods.contact) {
    if (inRange(localHour, seg.start, seg.end)) return "contact";
  }
  // 休息时段：读取配置的 rest 区间（支持跨午夜）。落在该区间或任何未分类小时均为休息。
  if (inRange(localHour, periods.rest.start, periods.rest.end)) return "rest";
  return "rest";
}

/** 半开区间判定，支持跨午夜（start>end 视为跨日，如 22~6）。 */
function inRange(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // 跨午夜
  return hour >= start || hour < end;
}

/**
 * 更广义的"昼夜状态"（WC-4），在三类时段基础上提供粗粒度白天/夜晚。
 * - 白天：6 ≤ h < 18
 * - 夜晚：h < 6 或 h ≥ 18
 */
export function isDaytime(localHour: number): boolean {
  return localHour >= 6 && localHour < 18;
}

/** 取某地点在绝对时刻的本地 DateTime。 */
export function localDateTime(timeZone: string, ms: number = Date.now()): DateTime {
  return DateTime.fromMillis(ms, { zone: timeZone });
}

/**
 * 时钟显示格式化，按小时格式设置与地点国家代码决定 12/24。
 * - "12"：统一十二小时制
 * - "24"：统一二十四小时制
 * - "mixed"：每个地点保留本地原生格式（依 prefers12Hour）
 */
export function formatClock(
  timeZone: string,
  ms: number,
  fmt: "12" | "24" | "mixed",
  countryCode: string,
): string {
  const dt = localDateTime(timeZone, ms);
  const use12 = fmt === "12" || (fmt === "mixed" && prefers12Hour(countryCode));
  return dt.toFormat(use12 ? "h:mm a" : "HH:mm");
}
export function timeZoneAbbrev(timeZone: string, ms: number = Date.now()): string | null {
  const date = new Date(ms);
  const locales = ["en-GB", "en-US"];
  for (const loc of locales) {
    try {
      const parts = new Intl.DateTimeFormat(loc, {
        timeZone,
        timeZoneName: "short",
      }).formatToParts(date);
      const name = parts.find((p) => p.type === "timeZoneName")?.value;
      if (name && !/^(GMT|UTC)[+-]?/.test(name)) {
        return name;
      }
    } catch {
      // 该 locale 不可用，尝试下一个
    }
  }
  return null;
}

/**
 * 判定某国家是否更倾向十二小时制（用于 mixed 模式）。
 * 美国、英国、澳大利亚、加拿大、新西兰、菲律宾、印度、巴基斯坦、孟加拉、埃及
 * 等日常使用十二小时制；其余视为二十四小时制。
 */
export function prefers12Hour(countryCode: string): boolean {
  const set = new Set([
    "US", "GB", "AU", "CA", "NZ", "PH", "IN", "PK", "BD", "EG",
    "IE", "JM", "TT", "CO", "MY", "NG", "ZA",
  ]);
  return set.has(countryCode.toUpperCase());
}
