import { DateTime } from "luxon";
import type { PlaceItem, TimeSelection, HourFormat } from "@/store/useWorldTimeStore";
import { prefers12Hour } from "@/lib/time";

/**
 * 生成"复制时间摘要"的纯文本（MS-3），供粘贴到聊天工具。
 * @param homeId 主地点 id，用于在摘要中标记"(主)"；主地点未必是列表首项。
 */
export function summaryText(
  selection: TimeSelection,
  places: PlaceItem[],
  hourFormat: HourFormat,
  locale: "zh" | "en",
  homeId: string | null,
): string {
  const lines: string[] = [];
  const title = locale === "zh" ? "会议时段" : "Meeting time";
  lines.push(`📅 ${title}`);
  lines.push("");
  for (const p of places) {
    const use12 =
      hourFormat === "12" ||
      (hourFormat === "mixed" && prefers12Hour(p.countryCode));
    // 起始时间含日期，按 12/24 制选择格式（修复原三元两分支相同的问题）
    const startFmt = use12 ? "MM-dd h:mm a" : "MM-dd HH:mm";
    const s = DateTime.fromMillis(selection.startMs, { zone: p.timeZone }).toFormat(
      `${startFmt} ZZZZ`,
    );
    const e = DateTime.fromMillis(selection.endMs, { zone: p.timeZone }).toFormat(
      use12 ? `h:mm a ZZZZ` : `HH:mm ZZZZ`,
    );
    // 主地点标记以真实 homeId 为准（而非列表首项）
    const home = p.id === homeId ? (locale === "zh" ? " (主)" : " (home)") : "";
    lines.push(`${p.flag} ${p.nameEn}${home}: ${s} - ${e}`);
  }
  return lines.join("\n");
}
