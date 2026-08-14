import { describe, it, expect } from "vitest";
import { CITIES, CITY_BY_ID } from "@/data/cities";

/**
 * 城市数据卫生回归（审查修复：消歧后缀曾内联进显示名，
 * 如 "Oakland US" / "巴勒莫意"，现与显示名分离）。
 */
describe("cities 名称卫生", () => {
  it("英文名不再以「空格+两位大写」消歧后缀结尾", () => {
    const bad = CITIES.filter((c) => / [A-Z]{2}$/.test(c.nameEn));
    expect(
      bad.map((c) => `${c.id}: ${c.nameEn}`),
      "含消歧后缀的英文名（如 Oakland US）",
    ).toEqual([]);
  });

  it("不存在「中文名+英文名+国家+时区」四字段完全相同的重复条目", () => {
    // 允许同名不同城（如 遂宁/睢宁，英文均 Suining）——那是有意保留的不同城市；
    // 四字段全同才是数据重复。
    const seen = new Map<string, number>();
    for (const c of CITIES) {
      const k = `${c.nameZh}|${c.nameEn}|${c.countryCode}|${c.timeZone}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    for (const [k, n] of seen) {
      expect(n, `完全重复条目 ${k}`).toBe(1);
    }
  });

  it("id 全部唯一，且 CITY_BY_ID 与 CITIES 一一对应", () => {
    const ids = CITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(Object.keys(CITY_BY_ID).length);
    for (const c of CITIES) {
      expect(CITY_BY_ID[c.id], `CITY_BY_ID 缺 ${c.id}`).toBeDefined();
    }
  });

  it("中英文名均非空", () => {
    for (const c of CITIES) {
      expect(c.nameZh.trim().length, `${c.id} 中文名为空`).toBeGreaterThan(0);
      expect(c.nameEn.trim().length, `${c.id} 英文名为空`).toBeGreaterThan(0);
    }
  });

  it("本轮清理的 14 条残留后缀/错误条目不再出现，纯净名存在", () => {
    // 全量剥离后的收尾（审查轮 R1）：国家/州名级后缀与伪「东/南/西/北」条目
    // 一律从显示名移除；与既有条目四字段全同的直接删除。
    const banned = [
      // 中文名（后缀/错误译名）
      "波特兰缅因", "哥伦比亚密苏里", "萨尔瓦多巴", "霍巴特塔斯",
      "姆巴巴内高", "温得和克西", "拉斯维加斯东", "基多南",
      "塞维利亚北", "洛格罗", "威尼斯北", "霍尼奥", "大丰东",
      // 英文名（后缀/错误条目）
      "Portland Maine", "Columbia Missouri", "Salvador Bahia", "Hobart TAS",
      "Mbabane High", "Windhoek West", "Las Vegas East", "Quito South",
      "Seville North", "Logroño South", "Venice North",
      "Vitória Brazil", "Natal Brazil", "Hono", "Dongtai East",
    ];
    for (const c of CITIES) {
      for (const b of banned) {
        expect(
          c.nameZh !== b && c.nameEn !== b,
          `${c.id} 仍含已清理条目 ${b}`,
        ).toBe(true);
      }
    }
    // 纯净名应存在（改名而非仅删除的条目）
    const enSet = new Set(CITIES.map((c) => c.nameEn));
    for (const pure of ["Portland", "Columbia", "Vitória", "Natal"]) {
      expect(enSet.has(pure), `缺少纯净名 ${pure}`).toBe(true);
    }
    // 纯错误数据条目（Quito 被标成 US/Phoenix 等）已被删除：国家+时区组合不再出现
    for (const c of CITIES) {
      expect(
        c.nameEn !== "Quito" || !(c.countryCode === "US" && c.timeZone === "America/Phoenix"),
        `${c.id} 含错误 Quito 条目`,
      ).toBe(true);
    }
  });
});
