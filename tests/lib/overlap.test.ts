import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { findOverlapSlots, slotInView } from "@/lib/overlap";
import { DEFAULT_DAY_PERIODS, type DayPeriods } from "@/store/useWorldTimeStore";
import { makePlace, PLACES } from "../helpers";

/**
 * 推荐时段（findOverlapSlots）测试。
 *
 * 断言基于 DEFAULT_DAY_PERIODS（工作 9–18、可联系 6–9/18–22、休息 22–6）
 * 与已知日历事实（周末、2026 假日数据、DST 切换日）推演。
 * 参考日期：2026-08-27 为周四 → 08-31 周一；10-30 周五、11-01 周日
 * （美国秋退日）、11-02 周一；09-30 周三、10-01/02 中国国庆（假日）、
 * 10-03/04 周末、10-05 周一；03-06 周五、03-08 周日（美国春进日）。
 */
const BJ = "Asia/Shanghai";
const NY = "America/New_York";
const KOLKATA = "Asia/Kolkata";

const beijing = PLACES.beijing();
const shanghai = makePlace({ id: "cn-shanghai", countryCode: "CN", timeZone: BJ });
const newYork = PLACES.newYork();
const london = PLACES.london();
const mumbai = PLACES.mumbai();

function ms(dateStr: string, zone: string): number {
  return DateTime.fromISO(dateStr, { zone }).toMillis();
}

function local(msVal: number, zone: string): DateTime {
  return DateTime.fromMillis(msVal, { zone });
}

describe("findOverlapSlots 推荐时段", () => {
  it("空地点列表返回空数组", () => {
    expect(findOverlapSlots([], DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T10:00", BJ))).toEqual([]);
  });

  it("全部时区非法返回空数组", () => {
    const invalid = makePlace({
      id: "bad-zone",
      countryCode: "CN",
      timeZone: "Foo/Bar",
    });
    expect(
      findOverlapSlots([invalid, { ...invalid, id: "bad-2" }], DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T10:00", BJ)),
    ).toEqual([]);
  });

  it("部分时区非法：合法地点仍参与判定（同区对得 green 档）", () => {
    const invalid = { ...newYork, timeZone: "Invalid/Zone" };
    const slots = findOverlapSlots([invalid, beijing], DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T10:00", BJ));
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].tier).toBe("green");
  });

  it("同时区对：当日剩余工作时段为首个 green 档，随后每个工作日各一段", () => {
    // 周一 10:00（北京）：09:00 列已整点结束被剔除，首个 green 从 10:00 起
    const slots = findOverlapSlots([beijing, shanghai], DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T10:00", BJ));
    expect(slots.length).toBe(6); // 5 个 green（周一~周五）+ 1 个 orange 补位
    expect(slots[0].tier).toBe("green");
    expect(local(slots[0].startMs, BJ).hour).toBe(10);
    expect(local(slots[0].endMs, BJ).hour).toBe(18);
    // green 优先：前 5 个均为 green，且起始于周一至周五
    const greens = slots.filter((s) => s.tier === "green");
    expect(greens).toHaveLength(5);
    for (const g of greens) {
      expect([1, 2, 3, 4, 5]).toContain(local(g.startMs, BJ).weekday);
    }
    // 第 6 条为最早的 orange 档（周一晚间可联系段 18:00–22:00）
    expect(slots[5].tier).toBe("orange");
    expect(local(slots[5].startMs, BJ).hour).toBe(18);
    expect(local(slots[5].endMs, BJ).hour).toBe(22);
  });

  it("跨 12 小时城市对（北京–纽约）：无 green 档，全部为 orange 折中档", () => {
    // 夏令时下两地差 12h：任何时刻总有一方处于休息/可联系段，无全员工作重叠
    const slots = findOverlapSlots([beijing, newYork], DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T10:00", BJ));
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.tier === "orange")).toBe(true);
    // 最早一条：北京周一 18:00–22:00（= 纽约周一 06:00–10:00，无人休息）
    expect(local(slots[0].startMs, BJ).hour).toBe(18);
    expect(local(slots[0].endMs, BJ).hour).toBe(22);
    expect(local(slots[0].startMs, NY).hour).toBe(6);
    // 次一条：北京周二 06:00–10:00（= 纽约周一 18:00–22:00）
    expect(local(slots[1].startMs, BJ).weekday).toBe(2);
    expect(local(slots[1].startMs, BJ).hour).toBe(6);
    expect(local(slots[1].endMs, BJ).hour).toBe(10);
  });

  it("周末列被排除：任何时段不始于周六/周日（北京对，周五 12:00 起）", () => {
    const slots = findOverlapSlots([beijing, shanghai], DEFAULT_DAY_PERIODS, BJ, ms("2026-09-25T12:00", BJ));
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect([1, 2, 3, 4, 5]).toContain(local(s.startMs, BJ).weekday);
    }
  });

  it("节假日列被排除：中国国庆（10-01/02）与周末（10-03/04）均无时段起始", () => {
    // 周三 09-30 10:00 起 7 天窗口 = 09-30 ~ 10-06
    const slots = findOverlapSlots([beijing, shanghai], DEFAULT_DAY_PERIODS, BJ, ms("2026-09-30T10:00", BJ));
    const greens = slots.filter((s) => s.tier === "green");
    // green 档：09-30（10:00 起）、10-05、10-06 三个工作日的 09:00–18:00
    expect(greens).toHaveLength(3);
    expect(greens.map((g) => local(g.startMs, BJ).toISODate())).toEqual([
      "2026-09-30",
      "2026-10-05",
      "2026-10-06",
    ]);
    for (const s of slots) {
      const d = local(s.startMs, BJ).toISODate();
      expect(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]).not.toContain(d);
    }
  });

  it("过去小时边界：整点 now 剔除刚结束的列，now 前一分钟保留该列", () => {
    // 10:00:00 整：09:00 列（09:00–10:00）已完整过去 → 首个 green 从 10:00 起
    const a = findOverlapSlots([beijing, shanghai], DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T10:00:00", BJ));
    expect(local(a[0].startMs, BJ).hour).toBe(10);
    // 09:59:00：09:00 列进行中 → 首个 green 从 09:00 起
    const b = findOverlapSlots([beijing, shanghai], DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T09:59:00", BJ));
    expect(local(b[0].startMs, BJ).hour).toBe(9);
  });

  it("DST 秋退周（美国 2026-11-01）：切换日后的工作日时段照常、边界整点对齐", () => {
    // 周五 10-30 12:00（纽约，EDT）；窗口覆盖 11-01 秋退日（周日，整日红）
    const slots = findOverlapSlots(
      [newYork, { ...newYork, id: "us-boston" }],
      DEFAULT_DAY_PERIODS,
      NY,
      ms("2026-10-30T12:00", NY),
    );
    const greens = slots.filter((s) => s.tier === "green");
    // green：10-30（12:00 起）、11-02~11-05 四个工作日（7 天窗口含 11-05）
    expect(greens.map((g) => local(g.startMs, NY).toISODate())).toEqual([
      "2026-10-30",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
    // 切换日（EST）后的周一工作段 09:00–18:00 本地时间正确
    expect(local(greens[1].startMs, NY).hour).toBe(9);
    expect(local(greens[1].endMs, NY).hour).toBe(18);
    // 选区边界与网格列对齐：时长为整小时数
    for (const s of slots) {
      expect((s.endMs - s.startMs) % 3600_000).toBe(0);
    }
  });

  it("单城市：返回自身工作时段（green 档）", () => {
    const slots = findOverlapSlots([beijing], DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T10:00", BJ));
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].tier).toBe("green");
    expect(local(slots[0].startMs, BJ).hour).toBe(10);
  });

  it("混档日（北京–伦敦，冬令时差 8h）：green 核心与 orange 边缘相邻但不重叠", () => {
    // 北京周一下午：14:00–17:00（伦敦清晨可联系）orange、17:00–18:00 全员工
    // 作 green（北京 18:00 即进入可联系段，全绿重叠仅一小时）、18:00–22:00
    // orange——分档合并后三段相邻、互不包含
    const slots = findOverlapSlots([beijing, london], DEFAULT_DAY_PERIODS, BJ, ms("2026-11-02T10:00", BJ));
    const greens = slots.filter((s) => s.tier === "green");
    expect(greens).toHaveLength(5); // 周一~周五各一段 17:00–18:00
    expect(local(greens[0].startMs, BJ).hour).toBe(17);
    expect(local(greens[0].endMs, BJ).hour).toBe(18);
    // 最早的 orange 为周一下午 14:00–17:00（第 6 条补位）
    expect(slots[5].tier).toBe("orange");
    expect(local(slots[5].startMs, BJ).hour).toBe(14);
    expect(local(slots[5].endMs, BJ).hour).toBe(17);
    // 不变式：按开始时间排序后，任何两段不重叠（green 不会被 orange 吞并）
    const byStart = [...slots].sort((x, y) => x.startMs - y.startMs);
    for (let i = 1; i < byStart.length; i++) {
      expect(byStart[i].startMs).toBeGreaterThanOrEqual(byStart[i - 1].endMs);
    }
  });

  it("非主地点半时区（北京–孟买 +5:30）：green 档按孟买 :30 本地时刻向下取整小时判定", () => {
    // 北京 12:00 = 孟买 09:30（hour 9，工作）；11:00 = 08:30（hour 8，可联系）
    // → 周一 green 从北京 12:00 起；窗口 08-31~09-06 共 5 个工作日 green
    const slots = findOverlapSlots([beijing, mumbai], DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T12:00", BJ));
    const greens = slots.filter((s) => s.tier === "green");
    expect(greens).toHaveLength(5);
    expect(local(greens[0].startMs, BJ).hour).toBe(12);
    expect(local(greens[0].endMs, BJ).hour).toBe(18);
    // 补位 orange 为周一夜间可联系段 18:00–22:00（孟买下午仍工作）
    expect(slots[5].tier).toBe("orange");
    expect(local(slots[5].startMs, BJ).hour).toBe(18);
    expect(local(slots[5].endMs, BJ).hour).toBe(22);
  });

  it("主地点半时区（孟买主场）：列锚定本地午夜，边界 ms 均为半点（mod 1h = 30min）", () => {
    // 主地点在 +5:30：本地午夜 = UTC 18:30，逐小时列的 ms 落在 UTC 半点
    const delhi = makePlace({ id: "in-delhi", countryCode: "IN", timeZone: KOLKATA });
    const slots = findOverlapSlots([mumbai, delhi], DEFAULT_DAY_PERIODS, KOLKATA, ms("2026-08-31T10:00", KOLKATA));
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].tier).toBe("green");
    expect(local(slots[0].startMs, KOLKATA).hour).toBe(10);
    expect(local(slots[0].endMs, KOLKATA).hour).toBe(18);
    for (const s of slots) {
      expect(s.startMs % 3600_000).toBe(1800_000);
      expect(s.endMs % 3600_000).toBe(1800_000);
    }
  });

  it("DST 春进周（美国 2026-03-08）：切换日后工作日时段照常、时长仍为整小时", () => {
    // 周五 03-06 12:00（EST）；窗口覆盖 03-08 春进日（周日，整日红、当日仅 23 列）
    const slots = findOverlapSlots(
      [newYork, { ...newYork, id: "us-boston" }],
      DEFAULT_DAY_PERIODS,
      NY,
      ms("2026-03-06T12:00", NY),
    );
    const greens = slots.filter((s) => s.tier === "green");
    // green：03-06（12:00 起）、03-09~03-12 四个工作日（7 天窗口止于 03-12）
    expect(greens.map((g) => local(g.startMs, NY).toISODate())).toEqual([
      "2026-03-06",
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
    ]);
    // 切换日（EDT）后的周一工作段 09:00–18:00 本地时间正确
    expect(local(greens[1].startMs, NY).hour).toBe(9);
    expect(local(greens[1].endMs, NY).hour).toBe(18);
    for (const s of slots) {
      expect((s.endMs - s.startMs) % 3600_000).toBe(0);
    }
  });

  it("自定义 dayPeriods 跨午夜：可联系段横跨主地点午夜仍合并为单段", () => {
    // 工作 10–16、可联系 16–24 与 0–2（横跨午夜）、休息 2–10；连续性按
    // columns 数组相邻判定（规约：跨日不裂段），橙段应为 16:00 起的 10 小时单段
    const dp: DayPeriods = {
      work: { start: 10, end: 16 },
      contact: [
        { start: 16, end: 24 },
        { start: 0, end: 2 },
      ],
      rest: { start: 2, end: 10 },
    };
    const slots = findOverlapSlots([beijing, shanghai], dp, BJ, ms("2026-08-31T10:00", BJ));
    const oranges = slots.filter((s) => s.tier === "orange");
    expect(oranges.length).toBeGreaterThan(0);
    for (const o of oranges) {
      expect(local(o.startMs, BJ).hour).toBe(16);
      // 结束落在次日 02:00：16:00 + 10h 单段横跨午夜，而非在 00:00 裂成两段
      expect(local(o.endMs, BJ).hour).toBe(2);
      expect(o.endMs - o.startMs).toBe(10 * 3600_000);
    }
  });

  it("30 地点满载（MAX_PLACES 上限）：结果与同时区对一致，上限 6 条", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...beijing, id: `cn-${i}` }));
    const slots = findOverlapSlots(many, DEFAULT_DAY_PERIODS, BJ, ms("2026-08-31T10:00", BJ));
    expect(slots).toHaveLength(6);
    expect(slots.filter((s) => s.tier === "green")).toHaveLength(5);
    expect(local(slots[0].startMs, BJ).hour).toBe(10);
    expect(local(slots[0].endMs, BJ).hour).toBe(18);
  });
});

describe("slotInView（第四期：结论卡视野定位）", () => {
  // 参考日期：2026-08-27 周四（今天）
  const now = ms("2026-08-27T10:00", BJ);
  const todaySlot = {
    startMs: ms("2026-08-27T10:00", BJ),
    endMs: ms("2026-08-27T11:00", BJ),
  };
  const tomorrowSlot = {
    startMs: ms("2026-08-28T10:00", BJ),
    endMs: ms("2026-08-28T11:00", BJ),
  };
  // 7 天窗口外（下下周）
  const farSlot = {
    startMs: ms("2026-09-07T10:00", BJ),
    endMs: ms("2026-09-07T11:00", BJ),
  };

  it("1 天视图：今天窗口内的推荐判定为在视野内", () => {
    expect(slotInView(todaySlot, BJ, null, 1, now)).toBe(true);
  });

  it("1 天视图：明天的推荐不在视野内（需切回七天并定位）", () => {
    expect(slotInView(tomorrowSlot, BJ, null, 1, now)).toBe(false);
  });

  it("7 天视图：未来一周内的推荐在视野内", () => {
    expect(slotInView(tomorrowSlot, BJ, null, 7, now)).toBe(true);
  });

  it("7 天视图：窗口外（下下周）的推荐不在视野内", () => {
    expect(slotInView(farSlot, BJ, null, 7, now)).toBe(false);
  });

  it("已翻到其它周（viewStartDateMs 偏移）：明天的推荐不在视野内", () => {
    const shifted = ms("2026-09-03T00:00", BJ); // 翻到 09-03 起 7 天
    expect(slotInView(tomorrowSlot, BJ, shifted, 7, now)).toBe(false);
  });

  it("已翻到其它周但推荐恰好在该周内：在视野内", () => {
    const shifted = ms("2026-08-28T00:00", BJ); // 翻到 08-28 起 7 天
    expect(slotInView(tomorrowSlot, BJ, shifted, 7, now)).toBe(true);
  });

  it("空列（非法时区）不误判为在视野内", () => {
    expect(slotInView(todaySlot, "Foo/Bar", null, 7, now)).toBe(false);
  });
});
