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
 *
 * 性能：纯计算见 nextDSTChangeUncached（逐月×逐日探测，多达 ~360 次 DateTime 构造）；
 * 本函数在其上做「时区 + fromMs 所在本地日 + maxMonths」的日级结果缓存。DST 切换每年
 * 至多两次，「now 之后下一次切换」在同一自然日内恒定，按本地日期键缓存安全且命中极高。
 * 动机：PlacesPanel 每个地点行每 30s 重渲染都调用一次，30 个地点即上万次 DateTime
 * 分配/分钟——缓存后降为每个时区每日一次真实计算。
 */
const nextDstCache = new Map<string, number | null>();
const NEXT_DST_CACHE_MAX = 1000;

function nextDSTChangeUncached(
  timeZone: string,
  fromMs: number,
  maxMonths: number,
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

export function nextDSTChange(
  timeZone: string,
  fromMs: number = Date.now(),
  maxMonths: number = 12,
): number | null {
  const dayKey = DateTime.fromMillis(fromMs, { zone: timeZone }).toISODate();
  const key = `${timeZone}|${dayKey}|${maxMonths}`;
  const cached = nextDstCache.get(key);
  if (cached !== undefined) return cached;
  const result = nextDSTChangeUncached(timeZone, fromMs, maxMonths);
  if (nextDstCache.size > NEXT_DST_CACHE_MAX) nextDstCache.clear();
  nextDstCache.set(key, result);
  return result;
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
/**
 * 时区缩写格式化器缓存。
 *
 * Intl.DateTimeFormat 构造昂贵（解析 locale/选项、内部建表），而 timeZoneAbbrev
 * 在每个地点行每次渲染都被调用。格式化器对同一 (locale, timeZone) 可复用于任意
 * 日期（缩写随日期变化由 formatToParts 自行处理），故按 locale|timeZone 缓存对象，
 * 仅保留廉价的 formatToParts 调用。
 */
const tzAbbrevFormatterCache = new Map<string, Intl.DateTimeFormat | null>();
const TZ_ABBREV_LOCALES = ["en-GB", "en-US"];

function tzAbbrevFormatter(locale: string, timeZone: string): Intl.DateTimeFormat | null {
  const key = locale + "|" + timeZone;
  if (tzAbbrevFormatterCache.has(key)) return tzAbbrevFormatterCache.get(key)!;
  let fmt: Intl.DateTimeFormat | null = null;
  try {
    fmt = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" });
  } catch {
    fmt = null; // 非法时区 / locale 不可用
  }
  tzAbbrevFormatterCache.set(key, fmt);
  return fmt;
}

export function timeZoneAbbrev(timeZone: string, ms: number = Date.now()): string | null {
  const date = new Date(ms);
  for (const loc of TZ_ABBREV_LOCALES) {
    const fmt = tzAbbrevFormatter(loc, timeZone);
    if (!fmt) continue;
    try {
      const parts = fmt.formatToParts(date);
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
 * 十二小时制国家集合（用于 mixed 模式）。
 * 美国、英国、澳大利亚、加拿大、新西兰、菲律宾、印度、巴基斯坦、孟加拉、埃及
 * 等日常使用十二小时制；其余视为二十四小时制。
 *
 * 提升为模块级常量：原实现每次调用都新建 Set，而该函数在网格/列表渲染热路径上
 * 被频繁调用（每个单元格、每个地点行）。
 */
const PREFERS_12HOUR_COUNTRIES = new Set([
  "US", "GB", "AU", "CA", "NZ", "PH", "IN", "PK", "BD", "EG",
  "IE", "JM", "TT", "CO", "MY", "NG", "ZA",
]);

/**
 * 判定某国家是否更倾向十二小时制（用于 mixed 模式）。
 */
export function prefers12Hour(countryCode: string): boolean {
  return PREFERS_12HOUR_COUNTRIES.has(countryCode.toUpperCase());
}
