import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { columnColor, placeHeatColor, heatLabel } from "@/lib/heatmap";
import { DEFAULT_DAY_PERIODS } from "@/store/useWorldTimeStore";
import { PLACES } from "../helpers";

/**
 * 热力图配色测试（MS-1 / 需求 4.3.1 / 4.3.2）。
 * 对应 REQUIREMENTS.md 验收第 5、6、7、8、9 条。
 */
describe("columnColor 配色规则", () => {
  it("空地点列表返回 null（不渲染热力）", () => {
    const ms = DateTime.fromISO("2026-07-15T12:00:00Z").toMillis();
    expect(columnColor([], ms, DEFAULT_DAY_PERIODS)).toBeNull();
  });

  it("验收第 7 条：全员工作时段 → 绿色", () => {
    // 北京、纽约、伦敦均在本地 9-18 的某同一绝对时刻
    // 取 UTC 2026-07-15 10:00 → 北京 18(边界外),需另选。
    // UTC 09:00 → 北京 17(工作)、纽约 05(非工作)... 不行。
    // 找一个让三地都工作的时刻较难，改用单一地点构造全绿：
    // 北京本地 12:00 → 北京工作，单地点即全绿。
    const ms = DateTime.fromISO("2026-07-15T12:00:00", { zone: "Asia/Shanghai" }).toMillis();
    expect(columnColor([PLACES.beijing()], ms, DEFAULT_DAY_PERIODS)).toBe("green");
  });

  it("验收第 5 条：北京 9 点 → 纽约前一日 21 点（可联系）→ 橙色", () => {
    // 北京本地 9:00（工作）= 纽约前日 21:00（可联系），无人休息
    const ms = DateTime.fromISO("2026-07-15T09:00:00", { zone: "Asia/Shanghai" }).toMillis();
    expect(columnColor([PLACES.beijing(), PLACES.newYork()], ms, DEFAULT_DAY_PERIODS)).toBe("orange");
  });

  it("验收第 6 条：纽约 22 点、伦敦次日 3 点（同休息）→ 红色", () => {
    // 找一绝对时刻使纽约本地 22:00 且伦敦本地 03:00。
    // 纽约(EDT -4) 22:00 = UTC 02:00 次日；伦敦(+1) = 03:00。
    const ms = DateTime.fromISO("2026-07-15T22:00:00", { zone: "America/New_York" }).toMillis();
    // 校验：伦敦此时应为 03:00
    expect(DateTime.fromMillis(ms, { zone: "Europe/London" }).hour).toBe(3);
    expect(columnColor([PLACES.newYork(), PLACES.london()], ms, DEFAULT_DAY_PERIODS)).toBe("red");
  });

  it("单地点休息时段 → 红色", () => {
    const ms = DateTime.fromISO("2026-07-15T02:00:00", { zone: "Asia/Shanghai" }).toMillis();
    expect(columnColor([PLACES.beijing()], ms, DEFAULT_DAY_PERIODS)).toBe("red");
  });

  it("周末覆盖：沙特周五任意时刻 → 红色（4.3.2 P0）", () => {
    // 2026-06-19 周五，沙特本地正午（本应工作时段）
    const ms = DateTime.fromISO("2026-06-19T12:00:00", { zone: "Asia/Riyadh" }).toMillis();
    expect(columnColor([PLACES.riyadh()], ms, DEFAULT_DAY_PERIODS)).toBe("red");
  });

  it("节假日覆盖（MS-7 / 验收第 9 条）：美方独立日（2026-07-04）整列红", () => {
    // 2026-07-04 美国独立日，纽约本地正午（本应工作时段）
    const ms = DateTime.fromISO("2026-07-04T12:00:00", { zone: "America/New_York" }).toMillis();
    expect(columnColor([PLACES.newYork()], ms, DEFAULT_DAY_PERIODS)).toBe("red");
  });

  it("节假日覆盖：中国国庆（2026-10-01）→ 红色", () => {
    const ms = DateTime.fromISO("2026-10-01T12:00:00", { zone: "Asia/Shanghai" }).toMillis();
    expect(columnColor([PLACES.beijing()], ms, DEFAULT_DAY_PERIODS)).toBe("red");
  });

  it("节假日覆盖：美国感恩节（2026-11-26，11月第四个周四）→ 红色", () => {
    const ms = DateTime.fromISO("2026-11-26T12:00:00", { zone: "America/New_York" }).toMillis();
    expect(columnColor([PLACES.newYork()], ms, DEFAULT_DAY_PERIODS)).toBe("red");
  });

  it("未收录国家的非工作时段不影响：仅按时段判定", () => {
    // 用未收录国家代码 XX，本地 12 点应仍按工作判定为绿
    const ms = DateTime.fromISO("2026-07-15T12:00:00", { zone: "Asia/Shanghai" }).toMillis();
    const p = { ...PLACES.beijing(), countryCode: "XX" };
    expect(columnColor([p], ms, DEFAULT_DAY_PERIODS)).toBe("green");
  });

  /**
   * 审查报告 P2：所有地点时区非法时 columnColor 应返回 null（不渲染热力），
   * 而非旧实现的「worst 保持初值 0 → green」误导用户为全员工作时段。
   */
  it("所有地点时区非法时返回 null（而非 green）", () => {
    const ms = DateTime.fromISO("2026-07-15T12:00:00Z").toMillis();
    const invalid = { ...PLACES.beijing(), timeZone: "Foo/Bar" };
    expect(columnColor([invalid], ms, DEFAULT_DAY_PERIODS)).toBeNull();
  });

  it("多地点中仅部分时区非法：合法地点仍参与判定", () => {
    // 一个非法 + 一个合法（北京本地 12:00 工作）→ 应为 green（合法地点决定）
    const ms = DateTime.fromISO("2026-07-15T12:00:00", { zone: "Asia/Shanghai" }).toMillis();
    const invalid = { ...PLACES.newYork(), timeZone: "Invalid/Zone" };
    expect(columnColor([invalid, PLACES.beijing()], ms, DEFAULT_DAY_PERIODS)).toBe("green");
  });
});

/**
 * 单元格级配色（首页两态改造）：热力从「整列取全员最差」改为「每格表达该
 * 地点自身的状态」——城市跨度大时列级最差色会让整片网格变红、失去信息量。
 */
describe("placeHeatColor 单元格级配色规则", () => {
  const beijing = PLACES.beijing();
  const newYork = PLACES.newYork();
  const riyadh = PLACES.riyadh();

  it("北京本地 12:00（工作时段）→ 绿色", () => {
    const ms = DateTime.fromISO("2026-07-15T12:00:00", { zone: "Asia/Shanghai" }).toMillis();
    expect(placeHeatColor(beijing.timeZone, beijing.countryCode, ms, DEFAULT_DAY_PERIODS)).toBe("green");
  });

  it("同一时刻两城各自着色互不拖累：北京 09:00 绿 / 纽约 21:00 橙", () => {
    // 旧列级逻辑下该列为 orange（取最差）；单元格级下各行独立
    const ms = DateTime.fromISO("2026-07-15T09:00:00", { zone: "Asia/Shanghai" }).toMillis();
    expect(placeHeatColor(beijing.timeZone, beijing.countryCode, ms, DEFAULT_DAY_PERIODS)).toBe("green");
    expect(placeHeatColor(newYork.timeZone, newYork.countryCode, ms, DEFAULT_DAY_PERIODS)).toBe("orange");
  });

  it("北京本地 02:00（休息）→ 红色", () => {
    const ms = DateTime.fromISO("2026-07-15T02:00:00", { zone: "Asia/Shanghai" }).toMillis();
    expect(placeHeatColor(beijing.timeZone, beijing.countryCode, ms, DEFAULT_DAY_PERIODS)).toBe("red");
  });

  it("周末覆盖：沙特周五 → 红色", () => {
    const ms = DateTime.fromISO("2026-06-19T12:00:00", { zone: "Asia/Riyadh" }).toMillis();
    expect(placeHeatColor(riyadh.timeZone, riyadh.countryCode, ms, DEFAULT_DAY_PERIODS)).toBe("red");
  });

  it("节假日覆盖：美国独立日（2026-07-04）→ 红色", () => {
    const ms = DateTime.fromISO("2026-07-04T12:00:00", { zone: "America/New_York" }).toMillis();
    expect(placeHeatColor(newYork.timeZone, newYork.countryCode, ms, DEFAULT_DAY_PERIODS)).toBe("red");
  });

  it("时区非法 → null", () => {
    const ms = DateTime.fromISO("2026-07-15T12:00:00Z").toMillis();
    expect(placeHeatColor("Foo/Bar", "CN", ms, DEFAULT_DAY_PERIODS)).toBeNull();
  });

  it("columnColor 与 placeHeatColor 的最差聚合保持一致", () => {
    // 北京 09:00（工作）+ 纽约 21:00（可联系）→ 列级 orange
    const ms = DateTime.fromISO("2026-07-15T09:00:00", { zone: "Asia/Shanghai" }).toMillis();
    expect(columnColor([beijing, newYork], ms, DEFAULT_DAY_PERIODS)).toBe("orange");
    // 全员非法 → null
    const invalid = { ...beijing, timeZone: "Foo/Bar" };
    expect(columnColor([invalid], ms, DEFAULT_DAY_PERIODS)).toBeNull();
  });
});

describe("heatLabel", () => {
  it("按传入的标签映射返回对应颜色文案", () => {
    // 中文标签（来自 messages/zh.json 的 Heatmap 命名空间）
    const zh = {
      green: "全员工作时段",
      orange: "有人可联系",
      red: "有人休息",
    } as const;
    // 英文标签（来自 messages/en.json 的 Heatmap 命名空间）
    const en = {
      green: "All working",
      orange: "Some contactable",
      red: "Someone resting",
    } as const;
    expect(heatLabel("green", { ...zh })).toBe("全员工作时段");
    expect(heatLabel("green", { ...en })).toBe("All working");
    expect(heatLabel("orange", { ...en })).toBe("Some contactable");
    expect(heatLabel("red", { ...en })).toBe("Someone resting");
  });
});
