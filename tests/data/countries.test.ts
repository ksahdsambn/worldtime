import { describe, it, expect } from "vitest";
import { getCountry } from "@/data/countries";

/**
 * 周末数据回归（审查修复：埃及/利比亚/阿尔及利亚/苏丹/叙利亚/约旦
 * 原误标周六周日 [6,7]，实际官方周末为周五周六 [5,6]）。
 * 编码：1=周一 … 7=周日。
 */
describe("countries 周末数据", () => {
  it("北非/中东修正国为周五周六休（[5,6]）", () => {
    const fridaySaturday = ["EG", "LY", "DZ", "SD", "SY", "JO"];
    for (const code of fridaySaturday) {
      expect(getCountry(code).weekendDays, `${code} 应为 [5,6]`).toEqual([5, 6]);
    }
  });

  it("海湾/以色列/巴勒斯坦为周五周六休（[5,6]）", () => {
    const gulf = ["SA", "QA", "BH", "KW", "OM", "YE", "IR", "IQ", "IL", "PS"];
    for (const code of gulf) {
      expect(getCountry(code).weekendDays, `${code} 应为 [5,6]`).toEqual([5, 6]);
    }
  });

  it("阿联酋 2022 起为周六周日休（[6,7]）", () => {
    expect(getCountry("AE").weekendDays).toEqual([6, 7]);
  });

  it("孟加拉国周五周六休（[5,6]，修复原误标 [6,7]）", () => {
    expect(getCountry("BD").weekendDays).toEqual([5, 6]);
  });

  it("阿富汗周五单休（[5]，修复原误标 [6,7]）", () => {
    expect(getCountry("AF").weekendDays).toEqual([5]);
  });

  it("主要国家为周六周日休（[6,7]）", () => {
    const saturdaySunday = ["CN", "JP", "KR", "GB", "US", "DE", "FR", "LB", "TR", "MA", "TN"];
    for (const code of saturdaySunday) {
      expect(getCountry(code).weekendDays, `${code} 应为 [6,7]`).toEqual([6, 7]);
    }
  });

  it("所有 weekendDays 均为 1~7 内的非空升序数组", () => {
    for (const code of ["EG", "SY", "CN", "SA", "US"]) {
      const days = getCountry(code).weekendDays;
      expect(days.length).toBeGreaterThan(0);
      for (const d of days) {
        expect(Number.isInteger(d) && d >= 1 && d <= 7, `${code} 非法周末日 ${d}`).toBe(true);
      }
      expect([...days].sort((a, b) => a - b)).toEqual(days);
    }
  });
});
