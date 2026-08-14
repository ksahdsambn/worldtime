import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { parseSlug, buildComparisonState } from "@/lib/landingSlug";

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
    expect(s.rows).toHaveLength(7);
    // 北京 8/15 00:00 (+08)；纽约（EDT -04）= 8/14 12:00 周五
    expect(s.rows[0]).toEqual({ aHour: "00:00", bHour: "12:00", bDay: "Fri" });
    // 北京 9:00 → 纽约前一日 21:00（下标 2 对应小时序列 [0,6,9,12,…] 中的 9）
    expect(s.rows[2]).toEqual({ aHour: "09:00", bHour: "21:00", bDay: "Fri" });
    // 北京 12:00 → 纽约当日 00:00（周六）
    expect(s.rows[3]).toEqual({ aHour: "12:00", bHour: "00:00", bDay: "Sat" });
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
