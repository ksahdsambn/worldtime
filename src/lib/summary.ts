import { DateTime } from "luxon";
import type { PlaceItem, TimeSelection, HourFormat } from "@/store/useWorldTimeStore";
import { prefers12Hour } from "@/lib/time";

/**
 * 生成"复制时间摘要"的纯文本（MS-3），供粘贴到聊天工具。
 * @param homeId 主地点 id，用于在摘要中标记主地点；主地点未必是列表首项。
 *
 * 重构（国际化扩展）：标题与主地点标记不再按 locale 硬编码，而是由调用方
 * 从 messages 中取出已翻译的文案传入，任意新增语言无需改动本函数。
 */
export interface SummaryLabels {
  /** 摘要标题，如"会议时段" / "Meeting time" */
  title: string;
  /** 主地点后缀，如" (主)" / " (home)" */
  homeSuffix: string;
}

export function summaryText(
  selection: TimeSelection,
  places: PlaceItem[],
  hourFormat: HourFormat,
  labels: SummaryLabels,
  homeId: string | null,
): string {
  const lines: string[] = [];
  lines.push(`📅 ${labels.title}`);
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
    const home = p.id === homeId ? labels.homeSuffix : "";
    lines.push(`${p.flag} ${p.nameEn}${home}: ${s} - ${e}`);
  }
  return lines.join("\n");
}
