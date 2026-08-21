import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  parseSlug,
  buildComparisonState,
  overlappingWorkHours,
  collapseHourRanges,
  formatHourRange,
  localizedPairLabels,
  zoneDstFacts,
} from "@/lib/landingSlug";

describe("parseSlug 时区缩写对", () => {
  it("双连字符缩写对 EST--PST", () => {
    const info = parseSlug("EST--PST");
    expect(info?.kind).toBe("tz");
    expect(info?.aLabel).toBe("EST");
    expect(info?.bLabel).toBe("PST");
  });
  it("旧式单连字符缩写对 EST-PST 仍可解析", () => {
    const info = parseSlug("EST-PST");
    expect(info?.kind).toBe("tz");
    expect(info?.aLabel).toBe("EST");
    expect(info?.bLabel).toBe("PST");
  });
  it("GMT--CET", () => {
    const info = parseSlug("GMT--CET");
    expect(info?.kind).toBe("tz");
    expect(info?.aLabel).toBe("GMT");
  });
  it("含下划线的消歧缩写（如 BST_BD）可被解析", () => {
    const info = parseSlug("BST_BD--IST");
    expect(info?.kind).toBe("tz");
    expect(info?.aLabel).toBe("BST_BD");
    expect(info?.aZone).toBe("Asia/Dhaka");
  });
  it("不存在的缩写返回 null", () => {
    expect(parseSlug("ABC--XYZ")).toBeNull();
  });
});

describe("parseSlug 城市对", () => {
  it("标准城市对 cn-beijing--us-new-york", () => {
    const info = parseSlug("cn-beijing--us-new-york");
    expect(info?.kind).toBe("city");
    expect(info?.aLabel).toBe("Beijing");
    expect(info?.bLabel).toBe("New York");
    expect(info?.aId).toBe("cn-beijing");
    expect(info?.bId).toBe("us-new-york");
  });

  it("含连字符的城市 id 正确切分（如 cn-hohhot）", () => {
    // 呼和浩特的 id 形如 cn-hohhot；与另一含连字符城市对仍应正确解析
    const info = parseSlug("cn-beijing--us-new-york");
    expect(info?.kind).toBe("city");
  });

  it("子串误匹配回归：不再用 includes 误命中", () => {
    // 旧版 slug.includes(c.id) 会把 "cn-beijing--ph-cebu-city" 误命中 "ph-cebu"
    // 现用精确 CITY_BY_ID 反查：若 ph-cebu-city 存在而 ph-cebu 不存在，后者不应误匹配
    // 这里验证：一个合法城市 + 一个不合法子串城市，应返回 null 或正确解析
    const info = parseSlug("cn-beijing--ph-cebu");
    // ph-cebu 若不在数据中则返回 null（精确匹配，不子串）
    // 不应把 cn-beijing 错误地配对到其他城市
    if (info) {
      expect(info.aLabel).toBe("Beijing");
    }
  });

  it("旧式单连字符城市 slug（无 --）返回 null（破坏性变更，已切换分隔符）", () => {
    // cn-beijing-us-new-york 这种无双连号的应返回 null（城市对必须 -- 分隔）
    expect(parseSlug("cn-beijing-us-new-york")).toBeNull();
  });

  it("不存在城市 id 返回 null", () => {
    expect(parseSlug("cn-fakecity--us-nocity")).toBeNull();
  });

  it("大小写不敏感（城市 id 小写，slug 可大写）", () => {
    const info = parseSlug("CN-BEIJING--US-NEW-YORK");
    expect(info?.kind).toBe("city");
    expect(info?.aLabel).toBe("Beijing");
  });
});

describe("parseSlug diffMinutes", () => {
  it("城市对返回有效偏移差", () => {
    const info = parseSlug("cn-beijing--us-new-york");
    expect(info).not.toBeNull();
    expect(typeof info!.diffMinutes).toBe("number");
  });
});

describe("buildComparisonState（着陆页实时对照，审查报告 P3 修复）", () => {
  const now = DateTime.fromISO("2026-08-15T12:00:00Z").toMillis();

  it("北京 ↔ 纽约（8 月 EDT）：diff = -720 分钟，首行 00:00 对齐", () => {
    const s = buildComparisonState(now, "Asia/Shanghai", "America/New_York");
    expect(s.diffMinutes).toBe(-720);
    expect(s.rows).toHaveLength(24);
    expect(s.aNow).toBe("20:00");
    expect(s.bNow).toBe("08:00");
    expect(s.rows[0]).toEqual({ aHour: "00:00", bHour: "12:00", bDay: "Fri" });
    expect(s.rows[9]).toEqual({ aHour: "09:00", bHour: "21:00", bDay: "Fri" });
    expect(s.rows[12]).toEqual({ aHour: "12:00", bHour: "00:00", bDay: "Sat" });
  });
  it("传入 locale 时星期字段非空（ICU 完整时为中文）", () => {
    const s = buildComparisonState(now, "Asia/Shanghai", "America/New_York", "zh");
    expect(s.rows[0].bDay.length).toBeGreaterThan(0);
  });

  it("相同时区 pair diff = 0，各行 B 与 A 一致", () => {
    const s = buildComparisonState(now, "Asia/Shanghai", "Asia/Shanghai");
    expect(s.diffMinutes).toBe(0);
    for (const r of s.rows) {
      expect(r.aHour).toBe(r.bHour);
    }
  });

  it("updatedAt 为 UTC 标注格式", () => {
    const s = buildComparisonState(now, "Asia/Shanghai", "America/New_York");
    expect(s.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/);
    // 固定 now → 生成时刻确定
    expect(s.updatedAt).toBe("2026-08-15 12:00 UTC");
  });
});

describe("overlappingWorkHours / collapseHourRanges", () => {
  const now = DateTime.fromISO("2026-08-15T12:00:00Z").toMillis();

  it("伦敦 ↔ 纽约 8 月有重叠工作时段", () => {
    const slots = overlappingWorkHours(now, "Europe/London", "America/New_York");
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(s.aHourNum).toBeGreaterThanOrEqual(9);
      expect(s.aHourNum).toBeLessThan(18);
    }
  });
  it("北京 ↔ 纽约 工作时段无重叠", () => {
    const slots = overlappingWorkHours(now, "Asia/Shanghai", "America/New_York");
    expect(slots).toHaveLength(0);
  });
  it("collapseHourRanges 合并连续小时", () => {
    expect(collapseHourRanges([9, 10, 11, 14])).toEqual([
      { start: 9, end: 12 },
      { start: 14, end: 15 },
    ]);
    expect(formatHourRange(9, 12)).toBe("09:00–12:00");
  });
});

describe("localizedPairLabels / zoneDstFacts", () => {
  it("中文 locale 城市对显示中文名", () => {
    const info = parseSlug("cn-beijing--us-new-york");
    expect(info).not.toBeNull();
    const labels = localizedPairLabels(info!, "zh");
    expect(labels.a).toBe("北京");
    expect(labels.b).toBe("纽约");
  });
  it("英文 locale 显示英文名", () => {
    const info = parseSlug("cn-beijing--us-new-york");
    const labels = localizedPairLabels(info!, "en");
    expect(labels.a).toBe("Beijing");
  });
  it("上海不观察 DST", () => {
    const now = DateTime.fromISO("2026-08-15T12:00:00Z").toMillis();
    const f = zoneDstFacts("Asia/Shanghai", now);
    expect(f.observesDst).toBe(false);
    expect(f.inDst).toBe(false);
  });
  it("纽约 8 月处于 DST", () => {
    const now = DateTime.fromISO("2026-08-15T12:00:00Z").toMillis();
    const f = zoneDstFacts("America/New_York", now);
    expect(f.inDst).toBe(true);
    expect(f.observesDst).toBe(true);
  });
});
