import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  buildColumns,
  todayStartMs,
  localHourAt,
  isWeekendAt,
} from "@/lib/grid";

describe("buildColumns", () => {
  it("默认生成 7 天 × 24 小时 = 168 列", () => {
    const start = DateTime.fromISO("2026-06-15T00:00:00", { zone: "Asia/Shanghai" }).toMillis();
    const cols = buildColumns("Asia/Shanghai", start, 7);
    expect(cols).toHaveLength(168);
  });
  it("首列为起始日 0 点，homeHour=0 dayIndex=0", () => {
    const start = DateTime.fromISO("2026-06-15T00:00:00", { zone: "Asia/Shanghai" }).toMillis();
    const first = buildColumns("Asia/Shanghai", start, 1)[0];
    expect(first.homeHour).toBe(0);
    expect(first.dayIndex).toBe(0);
  });
  it("列按时间升序排列", () => {
    const start = todayStartMs("Asia/Shanghai");
    const cols = buildColumns("Asia/Shanghai", start, 3);
    for (let i = 1; i < cols.length; i++) {
      expect(cols[i].ms).toBeGreaterThan(cols[i - 1].ms);
    }
  });
  it("列锚定主地点本地整点：每列 ms 对齐本地整点", () => {
    const start = todayStartMs("Asia/Shanghai");
    const cols = buildColumns("Asia/Shanghai", start, 1);
    for (const c of cols) {
      const dt = DateTime.fromMillis(c.ms, { zone: "Asia/Shanghai" });
      expect(dt.minute).toBe(0);
      expect(dt.second).toBe(0);
      expect(dt.millisecond).toBe(0);
    }
  });
});

/**
 * DST 切换窗口内的表头对齐回归（第六轮审查 #1）。
 *
 * TimeGrid 表头按 dayIndex 分组渲染 <th colSpan=count>，count 取该组在 columns
 * 中的实际列数（而非固定 24）。以下断言该分组的两个不变量，覆盖春进、秋退、
 * 含 DST 的窗口与无 DST 基线：
 *   1. 各组列数之和 === columns.length（表头总跨列 = 表体列数）
 *   2. 每组列数为该日实际小时数（春进日 23、秋退日 25、其余 24）
 */
function headerGroups(columns: ReturnType<typeof buildColumns>): Array<{ dayIndex: number; count: number }> {
  const groups: Array<{ dayIndex: number; count: number }> = [];
  for (const c of columns) {
    const last = groups[groups.length - 1];
    if (last && last.dayIndex === c.dayIndex) last.count++;
    else groups.push({ dayIndex: c.dayIndex, count: 1 });
  }
  return groups;
}

describe("buildColumns DST 表头对齐", () => {
  it("春进日作起始：表头总跨列 = 表体列数；春进日组为 23 列", () => {
    // 2026-03-08 为 NY 春进日（本地 02:00→03:00）
    const start = DateTime.fromISO("2026-03-08", { zone: "America/New_York" }).startOf("day").toMillis();
    const cols = buildColumns("America/New_York", start, 7);
    const groups = headerGroups(cols);
    const totalSpan = groups.reduce((s, g) => s + g.count, 0);
    expect(totalSpan).toBe(cols.length);
    // 春进日（dayIndex 0）只有 23 个本地小时
    const day0 = groups.find((g) => g.dayIndex === 0)!;
    expect(day0.count).toBe(23);
  });

  it("窗口含春进日：表头总跨列 = 表体列数；春进日组为 23 列，末组 1 列", () => {
    // 起始 2026-03-06，窗口含 03-08 春进
    const start = DateTime.fromISO("2026-03-06", { zone: "America/New_York" }).startOf("day").toMillis();
    const cols = buildColumns("America/New_York", start, 7);
    const groups = headerGroups(cols);
    const totalSpan = groups.reduce((s, g) => s + g.count, 0);
    expect(totalSpan).toBe(cols.length);
    // 春进日（dayIndex 2）23 列；DST 推移使末尾多出 1 列落在 dayIndex 7
    expect(groups.find((g) => g.dayIndex === 2)!.count).toBe(23);
    expect(groups[groups.length - 1].count).toBe(1);
  });

  it("秋退日作起始：表头总跨列 = 表体列数；秋退日组为 25 列", () => {
    // 2026-11-01 为 NY 秋退日（本地 02:00→01:00，01 时段重复）
    const start = DateTime.fromISO("2026-11-01", { zone: "America/New_York" }).startOf("day").toMillis();
    const cols = buildColumns("America/New_York", start, 7);
    const groups = headerGroups(cols);
    const totalSpan = groups.reduce((s, g) => s + g.count, 0);
    expect(totalSpan).toBe(cols.length);
    // 秋退日（dayIndex 0）有 25 个本地小时（01 出现两次）
    expect(groups.find((g) => g.dayIndex === 0)!.count).toBe(25);
  });

  it("无 DST 基线（北京）：7 组各 24 列", () => {
    const start = DateTime.fromISO("2026-03-08", { zone: "Asia/Shanghai" }).startOf("day").toMillis();
    const cols = buildColumns("Asia/Shanghai", start, 7);
    const groups = headerGroups(cols);
    expect(groups).toHaveLength(7);
    expect(groups.every((g) => g.count === 24)).toBe(true);
    expect(groups.reduce((s, g) => s + g.count, 0)).toBe(cols.length);
  });
});

describe("todayStartMs", () => {
  it("返回主地点本地午夜", () => {
    const now = DateTime.fromISO("2026-06-15T14:30:00", { zone: "Asia/Shanghai" }).toMillis();
    const start = todayStartMs("Asia/Shanghai", now);
    const dt = DateTime.fromMillis(start, { zone: "Asia/Shanghai" });
    expect(dt.hour).toBe(0);
    expect(dt.minute).toBe(0);
    expect(dt.day).toBe(15);
  });
});

describe("localHourAt", () => {
  it("北京 9 点对应纽约同绝对时刻的前一日 21 点（EDT 期间）", () => {
    const beijing9 = DateTime.fromISO("2026-07-15T09:00:00", { zone: "Asia/Shanghai" }).toMillis();
    // 北京 9:00 = UTC 1:00 = 纽约(EDT -4) 前日 21:00
    expect(localHourAt("America/New_York", beijing9)).toBe(21);
  });
  it("北京 14 点对应纽约同日凌晨 2 点（验收第 3 条）", () => {
    const beijing14 = DateTime.fromISO("2026-07-15T14:00:00", { zone: "Asia/Shanghai" }).toMillis();
    // 北京 14:00 = UTC 6:00 = 纽约(EDT) 2:00 同日
    expect(localHourAt("America/New_York", beijing14)).toBe(2);
  });
});

describe("isWeekendAt", () => {
  it("标准周末：北京周六周日", () => {
    // 2026-06-20 是周六
    const sat = DateTime.fromISO("2026-06-20T12:00:00", { zone: "Asia/Shanghai" }).toMillis();
    const sun = DateTime.fromISO("2026-06-21T12:00:00", { zone: "Asia/Shanghai" }).toMillis();
    const mon = DateTime.fromISO("2026-06-22T12:00:00", { zone: "Asia/Shanghai" }).toMillis();
    expect(isWeekendAt("Asia/Shanghai", "CN", sat)).toBe(true);
    expect(isWeekendAt("Asia/Shanghai", "CN", sun)).toBe(true);
    expect(isWeekendAt("Asia/Shanghai", "CN", mon)).toBe(false);
  });
  it("中东周末：沙特周五周六休，周日不休（验收第 8 条）", () => {
    // 2026-06-19 周五、06-20 周六、06-21 周日
    const fri = DateTime.fromISO("2026-06-19T12:00:00", { zone: "Asia/Riyadh" }).toMillis();
    const sat = DateTime.fromISO("2026-06-20T12:00:00", { zone: "Asia/Riyadh" }).toMillis();
    const sun = DateTime.fromISO("2026-06-21T12:00:00", { zone: "Asia/Riyadh" }).toMillis();
    expect(isWeekendAt("Asia/Riyadh", "SA", fri)).toBe(true);
    expect(isWeekendAt("Asia/Riyadh", "SA", sat)).toBe(true);
    expect(isWeekendAt("Asia/Riyadh", "SA", sun)).toBe(false);
  });
  it("未收录国家兜底周六周日", () => {
    const sat = DateTime.fromISO("2026-06-20T12:00:00", { zone: "UTC" }).toMillis();
    expect(isWeekendAt("UTC", "XX", sat)).toBe(true);
  });
});
