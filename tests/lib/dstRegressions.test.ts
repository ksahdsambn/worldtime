import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { nextDSTChange, isDST } from "@/lib/time";
import { buildColumns } from "@/lib/grid";
import { parseSlug } from "@/lib/landingSlug";
import { decodeState, encodeState } from "@/lib/shareUrl";

/**
 * 第 2 轮审查引入的 DST / 边界回归（用真实 IANA 规则实跑验证）。
 * 日期均为 2026 年实际切换日；IANA 数据更新导致切换日变化时应同步更新。
 */

describe("nextDSTChange 南北半球与特殊偏移", () => {
  const at = (iso: string, zone: string) =>
    DateTime.fromISO(iso, { zone }).toMillis();

  it("纽约 2026 春进日 3 月 8 日", () => {
    const next = nextDSTChange("America/New_York", at("2026-01-15T12:00:00", "America/New_York"))!;
    expect(DateTime.fromMillis(next, { zone: "America/New_York" }).toISODate()).toBe("2026-03-08");
  });
  it("悉尼（南半球）2026 秋退日 4 月 5 日", () => {
    const next = nextDSTChange("Australia/Sydney", at("2026-01-15T12:00:00", "Australia/Sydney"))!;
    expect(DateTime.fromMillis(next, { zone: "Australia/Sydney" }).toISODate()).toBe("2026-04-05");
  });
  it("Lord Howe 30 分钟 DST 切换（+11:00 → +10:30）", () => {
    const from = at("2026-01-15T12:00:00", "Australia/Lord_Howe");
    const next = nextDSTChange("Australia/Lord_Howe", from)!;
    expect(DateTime.fromMillis(next, { zone: "Australia/Lord_Howe" }).toISODate()).toBe("2026-04-05");
    expect(DateTime.fromMillis(from, { zone: "Australia/Lord_Howe" }).offset).toBe(660);
    expect(DateTime.fromMillis(next + 86_400_000, { zone: "Australia/Lord_Howe" }).offset).toBe(630);
  });
  it("开罗 2026 春进日 4 月 24 日（午夜切换，本地 00:00 不存在）", () => {
    const next = nextDSTChange("Africa/Cairo", at("2026-01-15T12:00:00", "Africa/Cairo"))!;
    expect(DateTime.fromMillis(next, { zone: "Africa/Cairo" }).toISODate()).toBe("2026-04-24");
  });
  it("上海无 DST 返回 null", () => {
    expect(nextDSTChange("Asia/Shanghai", Date.now())).toBeNull();
  });
});

describe("isDST 切换瞬间边界", () => {
  it("纽约 2026-03-08 01:59:59 未进 / 03:00:00 已进", () => {
    const zone = "America/New_York";
    const before = DateTime.fromISO("2026-03-08T01:59:59", { zone }).toMillis();
    const after = DateTime.fromISO("2026-03-08T03:00:00", { zone }).toMillis();
    expect(isDST(zone, before)).toBe(false);
    expect(isDST(zone, after)).toBe(true);
  });
});

describe("buildColumns DST 周列数", () => {
  it("春进周（含 3/8）整周 167 列、切换日 23 列", () => {
    const start = DateTime.fromISO("2026-03-08T00:00:00", { zone: "America/New_York" }).toMillis();
    const cols = buildColumns("America/New_York", start, 7);
    expect(cols.filter((c) => c.dayIndex === 0)).toHaveLength(23);
    expect(cols).toHaveLength(167);
  });
  it("秋退周（含 11/1）整周 169 列、切换日 25 列、epoch 全唯一", () => {
    const start = DateTime.fromISO("2026-11-01T00:00:00", { zone: "America/New_York" }).toMillis();
    const cols = buildColumns("America/New_York", start, 7);
    expect(cols.filter((c) => c.dayIndex === 0)).toHaveLength(25);
    expect(new Set(cols.map((c) => c.ms)).size).toBe(cols.length);
    expect(cols).toHaveLength(169);
  });
  it("半小时偏移主地点（Asia/Kolkata）列对齐本地整点", () => {
    const start = DateTime.fromISO("2026-06-01T00:00:00", { zone: "Asia/Kolkata" }).toMillis();
    const cols = buildColumns("Asia/Kolkata", start, 2);
    expect(cols).toHaveLength(48);
    expect(cols[0].homeHour).toBe(0);
    expect(cols[47].homeHour).toBe(23);
  });
});

describe("parseSlug 歧义与方向", () => {
  it("城市对 / 时区对 / 混合与畸形输入", () => {
    expect(parseSlug("cn-beijing--us-new-york")?.kind).toBe("city");
    expect(parseSlug("EST--PST")?.kind).toBe("tz");
    expect(parseSlug("cn-beijing--EST")).toBeNull();
    expect(parseSlug("EST--cn-beijing")).toBeNull();
    expect(parseSlug("--")).toBeNull();
    expect(parseSlug("a--b--c")).toBeNull();
  });
  it("跨日期变更线方向：檀香山落后苏瓦 22 小时（整数分钟）", () => {
    const info = parseSlug("fj-suva--us-honolulu");
    expect(info).not.toBeNull();
    expect(info!.diffMinutes).toBe(-1320);
  });
});

describe("decodeState 降级与往返", () => {
  it("畸形参数全部安全降级", () => {
    expect(decodeState("p=").places).toHaveLength(0);
    expect(decodeState("p=*cn-beijing,unknown-city").places.map((p) => p.id)).toEqual(["cn-beijing"]);
    expect(decodeState("p=cn-beijing,unknown-city").homeId).toBe("cn-beijing");
    expect(decodeState("s=200-100").selection).toBeNull();
    expect(decodeState("s=1-999999999999999").selection).toBeNull();
    expect(decodeState("c=-5").pinnedMs).toBeNull();
    expect(decodeState("c=abc").pinnedMs).toBeNull();
    expect(decodeState(`p=${Array(40).fill("cn-beijing").join(",")}`).places.length).toBeLessThanOrEqual(30);
  });
  it("encode → decode 完整往返", () => {
    const q = encodeState(
      [{
        id: "cn-beijing", nameZh: "北京", nameEn: "Beijing",
        countryZh: "中国", countryEn: "China",
        countryCode: "CN", flag: "🇨🇳", timeZone: "Asia/Shanghai", tags: [],
      }],
      "cn-beijing",
      { startMs: 1000, endMs: 3_600_000 },
      12345,
    );
    const st = decodeState(q);
    expect(st.homeId).toBe("cn-beijing");
    expect(st.selection).toEqual({ startMs: 1000, endMs: 3_600_000 });
    expect(st.pinnedMs).toBe(12345);
  });
});
