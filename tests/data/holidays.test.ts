import { describe, it, expect } from "vitest";
import { HOLIDAYS, isHoliday } from "@/data/holidays";

describe("holidays 数据完整性", () => {
  it("覆盖全球主流国家（≥40 国）", () => {
    expect(Object.keys(HOLIDAYS).length).toBeGreaterThanOrEqual(40);
  });

  it("所有 key 为合法 ISO alpha-2 大写代码", () => {
    for (const k of Object.keys(HOLIDAYS)) {
      expect(k).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("所有日期格式 YYYY-MM-DD 合法", () => {
    const re = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    for (const [code, dates] of Object.entries(HOLIDAYS)) {
      for (const d of dates) {
        expect(re.test(d), `${code} 非法日期 ${d}`).toBe(true);
      }
    }
  });

  it("每个国家内无重复日期", () => {
    for (const [code, dates] of Object.entries(HOLIDAYS)) {
      const set = new Set(dates);
      expect(set.size, `${code} 存在重复日期`).toBe(dates.length);
    }
  });

  it("覆盖年份 2024~2027", () => {
    const years = new Set<string>();
    for (const dates of Object.values(HOLIDAYS)) {
      for (const d of dates) years.add(d.slice(0, 4));
    }
    expect(years.has("2024")).toBe(true);
    expect(years.has("2025")).toBe(true);
    expect(years.has("2026")).toBe(true);
    expect(years.has("2027")).toBe(true);
  });
});

describe("isHoliday", () => {
  it("美国独立日 2026-07-04", () => {
    expect(isHoliday("US", "2026-07-04")).toBe(true);
  });
  it("美国感恩节 2026-11-26（11月第四个周四）", () => {
    expect(isHoliday("US", "2026-11-26")).toBe(true);
  });
  it("中国国庆 2026-10-01", () => {
    expect(isHoliday("CN", "2026-10-01")).toBe(true);
  });
  it("中国春节 2026-02-17", () => {
    expect(isHoliday("CN", "2026-02-17")).toBe(true);
  });
  it("英国圣诞 2026-12-25", () => {
    expect(isHoliday("GB", "2026-12-25")).toBe(true);
  });
  it("日本元旦 2026-01-01", () => {
    expect(isHoliday("JP", "2026-01-01")).toBe(true);
  });
  it("非假日日期返回 false", () => {
    expect(isHoliday("US", "2026-07-15")).toBe(false);
  });
  it("未收录国家返回 false", () => {
    expect(isHoliday("XX", "2026-01-01")).toBe(false);
  });
  it("大小写不敏感", () => {
    expect(isHoliday("us", "2026-07-04")).toBe(true);
  });
});
