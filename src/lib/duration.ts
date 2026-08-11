/**
 * 将毫秒时长格式化为自然语言（如"1小时30分钟" / "1 hour 30 minutes"）。
 *
 * 单复数与文案与 messages/{zh,en}.json 的 Selection 命名空间保持一致：
 * - zh: hour/hours 均"小时"、minute/minutes 均"分钟"，数字与单位间无空格
 * - en: hour/hours、minute/minutes 区分单复数，数字与单位间有空格
 */
const DURATION_WORDS = {
  zh: { hour: "小时", hours: "小时", minute: "分钟", minutes: "分钟", zero: "0分钟" },
  en: { hour: "hour", hours: "hours", minute: "minute", minutes: "minutes", zero: "0 minutes" },
} as const;

export function formatDuration(ms: number, locale: "zh" | "en"): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const w = DURATION_WORDS[locale];
  const sep = locale === "zh" ? "" : " ";
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}${sep}${h === 1 ? w.hour : w.hours}`);
  if (m > 0) parts.push(`${m}${sep}${m === 1 ? w.minute : w.minutes}`);
  return parts.join(sep) || w.zero;
}
