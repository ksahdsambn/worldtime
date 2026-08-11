/**
 * 将毫秒时长格式化为自然语言（如"1小时30分钟" / "1 hour 30 minutes"）。
 *
 * 重构（国际化扩展）：不再依赖 locale 字符串做二元判断，而是由调用方
 * 从 messages 中取出已翻译的单位词与分隔符传入。这样任意新增语言无需
 * 改动本函数。单位词与 Selection 命名空间保持一致：
 * - zh: hour/hours 均"小时"、minute/minutes 均"分钟"，数字与单位间无空格
 * - 其它语言: 区分单复数，数字与单位间有空格
 */
export interface DurationWords {
  /** "1 小时" 用的单数词 */
  hour: string;
  /** "2 小时" 用的复数词 */
  hours: string;
  /** "1 分钟" 用的单数词 */
  minute: string;
  /** "2 分钟" 用的复数词 */
  minutes: string;
  /** 0 时长显示，如 "0 minutes" / "0分钟" */
  zero: string;
  /** 数字与单位之间的分隔符，中文为 ""，多数西方语言为 " " */
  sep: string;
}

export function formatDuration(ms: number, w: DurationWords): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const sep = w.sep;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}${sep}${h === 1 ? w.hour : w.hours}`);
  if (m > 0) parts.push(`${m}${sep}${m === 1 ? w.minute : w.minutes}`);
  return parts.join(sep) || w.zero;
}

/**
 * 由 locale 推导 DurationWords 的默认分隔符：中文（含繁体）无空格，其余语言有空格。
 * 仅供未提供显式 sep 的便捷路径使用；组件层一般直接传完整 DurationWords。
 */
export function defaultSep(locale: string): string {
  // 用 startsWith("zh") 兼容 zh（简体）与 zh-Hant（繁体）等中文变体
  return locale.startsWith("zh") ? "" : " ";
}
