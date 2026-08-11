import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { summaryText, type SummaryLabels } from "@/lib/summary";
import { PLACES } from "../helpers";

// 中英文标签，与 messages 中 Summary 命名空间一致
const ZH: SummaryLabels = { title: "会议时段", homeSuffix: " (主)" };
const EN: SummaryLabels = { title: "Meeting time", homeSuffix: " (home)" };

describe("summaryText 复制时间摘要 (MS-3)", () => {
  const selection = {
    startMs: DateTime.fromISO("2026-07-15T09:00:00", { zone: "Asia/Shanghai" }).toMillis(),
    endMs: DateTime.fromISO("2026-07-15T10:30:00", { zone: "Asia/Shanghai" }).toMillis(),
  };

  it("含标题与各地点", () => {
    const txt = summaryText(selection, [PLACES.beijing(), PLACES.newYork()], "24", ZH, "cn-beijing");
    expect(txt).toContain("会议时段");
    expect(txt).toContain("Beijing");
    expect(txt).toContain("New York");
  });

  it("主地点标记以真实 homeId 为准（非列表首项）", () => {
    // 主地点为第二项纽约
    const txt = summaryText(
      selection,
      [PLACES.beijing(), PLACES.newYork()],
      "24",
      ZH,
      "us-new-york",
    );
    expect(txt).toContain("New York (主)");
    // 北京非主地点，不带 (主)
    expect(txt).not.toContain("Beijing (主)");
  });

  it("中文主标记 / 英文主标记", () => {
    const zh = summaryText(selection, [PLACES.beijing()], "24", ZH, "cn-beijing");
    const en = summaryText(selection, [PLACES.beijing()], "24", EN, "cn-beijing");
    expect(zh).toContain("(主)");
    expect(en).toContain("(home)");
  });

  it("12 小时制含 AM/PM（修复原两分支相同 bug）", () => {
    const txt = summaryText(selection, [PLACES.beijing()], "12", ZH, "cn-beijing");
    expect(txt).toMatch(/(AM|PM)/);
  });

  it("含时区偏移信息", () => {
    const txt = summaryText(selection, [PLACES.beijing()], "24", ZH, "cn-beijing");
    // Asia/Shanghai 偏移 +8
    expect(txt).toMatch(/\+8|GMT\+8|UTC\+8/);
  });
});
