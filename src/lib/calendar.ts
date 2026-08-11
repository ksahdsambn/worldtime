import { DateTime } from "luxon";
import type { PlaceItem, TimeSelection } from "@/store/useWorldTimeStore";

/**
 * 日历导出工具（MS-2）。
 *
 * 关键点：导出的时间必须是带时区信息的绝对时刻（非浮动时间），
 * 否则跨时区导入会偏移。这里用 iCalendar 的 VTIMEZONE + UTC DTSTART/DTEND
 * 保证 Outlook/iCal 等客户端正确解析。
 */

/** RFC5545 行折叠：每 75 字符换行（前置空格）。 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    chunks.push(line.slice(i, i + 73));
    i += 73;
  }
  return chunks.join("\r\n ");
}

/**
 * RFC5545 §3.3.11 TEXT 转义：TEXT 类型值须转义反斜杠、分号、逗号、换行。
 * 用于 SUMMARY / DESCRIPTION 等字段，避免含逗号的城市名（如 "Washington, D.C."）
 * 被严格解析器误拆。
 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** DTSTAMP / DTSTART / DTEND 用的时间戳（UTC，RFC5545 basic format，含 T 分隔符与 Z 后缀）。 */
function stampUtc(ms: number): string {
  return DateTime.fromMillis(ms, { zone: "utc" }).toFormat("yyyyMMdd'T'HHmmss'Z'");
}

/**
 * 生成单事件 .ics 字符串。
 * @param selection 选区（绝对时刻）
 * @param places 地点列表（写入摘要与描述）
 */
export function buildIcs(selection: TimeSelection, places: PlaceItem[]): string {
  const dtStart = stampUtc(selection.startMs);
  const dtEnd = stampUtc(selection.endMs);
  const dtStamp = stampUtc(Date.now());
  const uid = `worldtime-${selection.startMs}-${selection.endMs}@worldtime.app`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WorldTime//Meeting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(meetingSummary(places))}`,
    `DESCRIPTION:${icsDescription(selection, places)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n");
}

/** 会议摘要：各地列表。 */
function meetingSummary(places: PlaceItem[]): string {
  if (places.length === 0) return "Meeting";
  return `Meeting (${places.map((p) => p.nameEn).join(", ")})`;
}

/**
 * 各地点本地时间行（未转义的纯文本）。
 * 抽取为共享函数，供 meetingDescription（未转义、mailto/Google 正文）与
 * icsDescription（每行做 RFC5545 TEXT 转义、ICS DESCRIPTION）复用，
 * 避免两处重复格式化逻辑。
 */
function meetingLines(selection: TimeSelection, places: PlaceItem[]): string[] {
  return places.map((p) => {
    const s = DateTime.fromMillis(selection.startMs, { zone: p.timeZone }).toFormat(
      "yyyy-MM-dd HH:mm (ZZZZ)",
    );
    const e = DateTime.fromMillis(selection.endMs, { zone: p.timeZone }).toFormat(
      "HH:mm (ZZZZ)",
    );
    return `${p.nameEn}: ${s} - ${e}`;
  });
}

/**
 * 会议描述：各地点本地时间，行间以字面 `\n` 连接。
 * 返回未转义的纯文本，供 mailto/Google 正文与测试使用。
 */
export function meetingDescription(
  selection: TimeSelection,
  places: PlaceItem[],
): string {
  return meetingLines(selection, places).join("\\n");
}

/**
 * 构造符合 RFC5545 的 DESCRIPTION：每行先转义 TEXT 特殊字符（逗号/分号/反斜杠/换行），
 * 再以字面 `\n`（反斜杠+n）连接。城市名中的逗号（如 "Washington, D.C."）不会被误拆。
 */
function icsDescription(selection: TimeSelection, places: PlaceItem[]): string {
  return meetingLines(selection, places).map(escapeText).join("\\n");
}

/**
 * 触发 .ics 文件下载。
 */
export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 释放对象 URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 生成 Google 日历"添加事件"链接（用户访问时预填事件）。
 * Google 接受 UTC 形如 20260810T090000Z。
 */
export function googleCalendarUrl(selection: TimeSelection, places: PlaceItem[]): string {
  const fmt = (ms: number) =>
    DateTime.fromMillis(ms, { zone: "utc" }).toFormat("yyyyMMdd'T'HHmmss'Z'");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meetingSummary(places),
    dates: `${fmt(selection.startMs)}/${fmt(selection.endMs)}`,
    details: meetingDescription(selection, places).replace(/\\n/g, "\n"),
    trp: "false",
    sf: "true",
    output: "xml",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * 生成邮件链接（MS-4）：mailto: 带事件主题与正文。
 */
export function mailtoUrl(selection: TimeSelection, places: PlaceItem[]): string {
  const subject = meetingSummary(places);
  const body = meetingDescription(selection, places).replace(/\\n/g, "\n");
  const params = new URLSearchParams({ subject, body });
  return `mailto:?${params.toString()}`;
}

/**
 * 编码状态为 base64（URL 安全），用于事件页路径（MS-5）。
 * 使用 TextEncoder 替代已废弃的 escape/unescape（ECMAScript Annex B），
 * 保证在移除 Annex B 的引擎上仍可用。
 */
export function encodeEventCode(query: string): string {
  if (typeof window === "undefined") {
    // Node 环境
    return Buffer.from(query, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  const bytes = new TextEncoder().encode(query);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * 解码 URL 安全 base64（补齐 padding，兼容缺失 padding 的情况）。
 * 用于事件页/事件小组件还原状态（MS-5 / 第七章 6.2）。
 */
export function decodeEventCode(code: string): string {
  const normalized = code.replace(/-/g, "+").replace(/_/g, "/");
  // 补齐 base64 所需的 padding（长度须为 4 的倍数）
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  if (typeof window === "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
