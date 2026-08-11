import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  isDST,
  offsetMinutes,
  diffOffsetMinutes,
  formatOffset,
  classifyLocalPeriod,
  isDaytime,
  prefers12Hour,
  formatClock,
} from "@/lib/time";
import { DEFAULT_DAY_PERIODS } from "@/store/useWorldTimeStore";

describe("offsetMinutes", () => {
  it("北京为东八区 +480", () => {
    // 取任意时刻，固定偏移
    const ms = DateTime.fromISO("2026-06-15T12:00:00", { zone: "utc" }).toMillis();
    expect(offsetMinutes("Asia/Shanghai", ms)).toBe(480);
  });
  it("UTC 偏移恒为 0", () => {
    const ms = Date.now();
    expect(offsetMinutes("UTC", ms)).toBe(0);
  });
  it("无效时区返回 0", () => {
    expect(offsetMinutes("Foo/Bar", Date.now())).toBe(0);
  });
});

describe("diffOffsetMinutes", () => {
  it("北京相对纽约在 EDT 期间差 -12 小时（纽约 -4，北京 +8）", () => {
    const ms = DateTime.fromISO("2026-07-15T12:00:00Z").toMillis();
    // 北京(+8) - 纽约(-4) = 纽约落后 720 分钟 = 12 小时
    expect(diffOffsetMinutes("Asia/Shanghai", "America/New_York", ms)).toBe(-720);
  });
  it("纽约相对北京为 +12 小时", () => {
    const ms = DateTime.fromISO("2026-07-15T12:00:00Z").toMillis();
    expect(diffOffsetMinutes("America/New_York", "Asia/Shanghai", ms)).toBe(720);
  });
});

describe("DST (isDST)", () => {
  it("纽约 7 月处于夏令时", () => {
    const ms = DateTime.fromISO("2026-07-15T12:00:00Z").toMillis();
    expect(isDST("America/New_York", ms)).toBe(true);
  });
  it("纽约 1 月不处于夏令时", () => {
    const ms = DateTime.fromISO("2026-01-15T12:00:00Z").toMillis();
    expect(isDST("America/New_York", ms)).toBe(false);
  });
  it("北京无 DST", () => {
    expect(isDST("Asia/Shanghai", Date.now())).toBe(false);
  });
  it("伦敦 1 月无 DST、7 月有 DST", () => {
    expect(isDST("Europe/London", DateTime.fromISO("2026-01-15T12:00:00Z").toMillis())).toBe(false);
    expect(isDST("Europe/London", DateTime.fromISO("2026-07-15T12:00:00Z").toMillis())).toBe(true);
  });
});

describe("formatOffset", () => {
  it("整点偏移无冒号", () => {
    expect(formatOffset(480)).toBe("+8");
    expect(formatOffset(-300)).toBe("-5");
    expect(formatOffset(0)).toBe("+0");
  });
  it("半小时偏移带分", () => {
    expect(formatOffset(330)).toBe("+5:30");
    expect(formatOffset(-270)).toBe("-4:30");
  });
});

describe("classifyLocalPeriod", () => {
  it("默认时段：工作 9-18", () => {
    expect(classifyLocalPeriod(9)).toBe("work");
    expect(classifyLocalPeriod(12)).toBe("work");
    expect(classifyLocalPeriod(17)).toBe("work");
  });
  it("可联系时段 6-9 / 18-22", () => {
    expect(classifyLocalPeriod(6)).toBe("contact");
    expect(classifyLocalPeriod(8)).toBe("contact");
    expect(classifyLocalPeriod(18)).toBe("contact");
    expect(classifyLocalPeriod(21)).toBe("contact");
  });
  it("休息时段（跨午夜）22-6", () => {
    expect(classifyLocalPeriod(22)).toBe("rest");
    expect(classifyLocalPeriod(0)).toBe("rest");
    expect(classifyLocalPeriod(5)).toBe("rest");
  });
  it("边界：18 属于可联系而非工作（半开区间）", () => {
    expect(classifyLocalPeriod(18, DEFAULT_DAY_PERIODS)).toBe("contact");
  });
  it("边界：9 闭区间起算工作", () => {
    expect(classifyLocalPeriod(9)).toBe("work");
  });
});

describe("isDaytime", () => {
  it("白天 6-18", () => {
    expect(isDaytime(6)).toBe(true);
    expect(isDaytime(12)).toBe(true);
    expect(isDaytime(17)).toBe(true);
  });
  it("夜晚", () => {
    expect(isDaytime(5)).toBe(false);
    expect(isDaytime(18)).toBe(false);
    expect(isDaytime(23)).toBe(false);
  });
});

describe("prefers12Hour", () => {
  it("美英等用十二小时制", () => {
    expect(prefers12Hour("US")).toBe(true);
    expect(prefers12Hour("GB")).toBe(true);
    expect(prefers12Hour("IN")).toBe(true);
  });
  it("中德等用二十四小时制", () => {
    expect(prefers12Hour("CN")).toBe(false);
    expect(prefers12Hour("DE")).toBe(false);
    expect(prefers12Hour("JP")).toBe(false);
  });
});

describe("formatClock", () => {
  const ms = DateTime.fromISO("2026-06-15T14:30:00", { zone: "Asia/Shanghai" }).toMillis();

  it("24 小时制：HH:mm", () => {
    expect(formatClock("Asia/Shanghai", ms, "24", "CN")).toBe("14:30");
  });
  it("12 小时制：h:mm a", () => {
    expect(formatClock("Asia/Shanghai", ms, "12", "CN")).toBe("2:30 PM");
  });
  it("mixed：中国保留 24 小时制", () => {
    expect(formatClock("Asia/Shanghai", ms, "mixed", "CN")).toBe("14:30");
  });
  it("mixed：美国用 12 小时制", () => {
    const usMs = DateTime.fromISO("2026-06-15T14:30:00", { zone: "America/New_York" }).toMillis();
    expect(formatClock("America/New_York", usMs, "mixed", "US")).toBe("2:30 PM");
  });
});
