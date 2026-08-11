import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { sunRiseSet } from "@/lib/sun";

/**
 * 日出日落回归测试（6.7）。
 *
 * 重点覆盖「时区换算」：旧实现把相对 UTC 午夜的分钟数加到本地午夜 epoch，
 * 导致结果整体偏差一个 UTC 偏移。这里对多个时区（含半小时偏移、东西半球、
 * DST 期内）校验日出日落落在合理时段，且与权威值误差在可接受范围。
 */
describe("sunRiseSet 时区换算", () => {
  // 容忍简化 NOAA 算法与权威值的几分钟误差。
  function minutesOfDay(dt: DateTime | null): number | null {
    if (!dt) return null;
    return dt.hour * 60 + dt.minute;
  }
  // 期望「HH:mm」转为分钟，返回 [lo, hi] 的 ±tolerance 分钟窗口
  function windowAround(hhmm: string, tolMin: number): [number, number] {
    const [h, m] = hhmm.split(":").map(Number);
    const mid = h * 60 + m;
    return [mid - tolMin, mid + tolMin];
  }

  it("北京夏至日出 ~04:46 / 日落 ~19:46（东八区，曾偏差 16h）", () => {
    const ms = DateTime.fromISO("2026-06-21T12:00:00Z").toMillis();
    const { rise, set } = sunRiseSet(39.9042, 116.4074, "Asia/Shanghai", ms);
    const r = minutesOfDay(rise);
    const s = minutesOfDay(set);
    const [rLo, rHi] = windowAround("04:46", 10);
    const [sLo, sHi] = windowAround("19:46", 10);
    expect(r).not.toBeNull();
    expect(s).not.toBeNull();
    expect(r! >= rLo && r! <= rHi).toBe(true);
    expect(s! >= sLo && s! <= sHi).toBe(true);
  });

  it("伦敦夏至日出 ~04:43 / 日落 ~21:21（BST 期内）", () => {
    const ms = DateTime.fromISO("2026-06-21T12:00:00Z").toMillis();
    const { rise, set } = sunRiseSet(51.5074, -0.1278, "Europe/London", ms);
    const r = minutesOfDay(rise);
    const [rLo, rHi] = windowAround("04:43", 10);
    expect(r! >= rLo && r! <= rHi).toBe(true);
    const s = minutesOfDay(set);
    const [sLo, sHi] = windowAround("21:21", 10);
    expect(s! >= sLo && s! <= sHi).toBe(true);
  });

  it("纽约夏至日出 ~05:25 / 日落 ~20:30（EDT 期内，西五区）", () => {
    const ms = DateTime.fromISO("2026-06-21T12:00:00Z").toMillis();
    const { rise, set } = sunRiseSet(40.71, -74.0, "America/New_York", ms);
    const r = minutesOfDay(rise);
    const [rLo, rHi] = windowAround("05:25", 10);
    expect(r! >= rLo && r! <= rHi).toBe(true);
    const s = minutesOfDay(set);
    const [sLo, sHi] = windowAround("20:30", 10);
    expect(s! >= sLo && s! <= sHi).toBe(true);
  });

  it("半小时偏移时区：孟买夏至日出 ~06:03（Asia/Kolkata +5:30）", () => {
    const ms = DateTime.fromISO("2026-06-21T12:00:00Z").toMillis();
    const { rise } = sunRiseSet(19.076, 72.8777, "Asia/Kolkata", ms);
    const r = minutesOfDay(rise);
    const [rLo, rHi] = windowAround("06:03", 15);
    expect(r! >= rLo && r! <= rHi).toBe(true);
  });

  it("南半球：悉尼 6 月（当地冬季）日出晚、日落早", () => {
    const ms = DateTime.fromISO("2026-06-21T12:00:00Z").toMillis();
    const { rise, set } = sunRiseSet(-33.87, 151.21, "Australia/Sydney", ms);
    const r = minutesOfDay(rise);
    const s = minutesOfDay(set);
    // 日落应早于 17:30，日出应晚于 06:30（冬季短日）
    expect(s!).toBeLessThan(17 * 60 + 30);
    expect(r!).toBeGreaterThan(6 * 60 + 30);
  });

  it("回归断言：日出日落不再整体偏差一个 UTC 偏移（北京不出现 20:46）", () => {
    // 旧 bug：北京夏至日出输出 20:46（= 04:46 + 16h，双倍偏移）。
    // 修复后应远早于 12:00（中午）。
    const ms = DateTime.fromISO("2026-06-21T12:00:00Z").toMillis();
    const { rise } = sunRiseSet(39.9042, 116.4074, "Asia/Shanghai", ms);
    expect(minutesOfDay(rise)!).toBeLessThan(12 * 60);
  });

  it("日落恒晚于日出（rise < set）：覆盖东半球、西半球、南半球", () => {
    const ms = DateTime.fromISO("2026-06-21T12:00:00Z").toMillis();
    const cases: Array<{ name: string; lat: number; lng: number; zone: string }> = [
      { name: "北京", lat: 39.9042, lng: 116.4074, zone: "Asia/Shanghai" },
      { name: "纽约", lat: 40.71, lng: -74.0, zone: "America/New_York" },
      { name: "悉尼", lat: -33.87, lng: 151.21, zone: "Australia/Sydney" },
      { name: "檀香山", lat: 21.3069, lng: -157.8583, zone: "Pacific/Honolulu" },
    ];
    for (const c of cases) {
      const { rise, set } = sunRiseSet(c.lat, c.lng, c.zone, ms);
      expect(rise).not.toBeNull();
      expect(set).not.toBeNull();
      expect(rise!.toMillis()).toBeLessThan(set!.toMillis());
    }
  });

  it("近极昼纬度（Reykjavík 64°N 夏至）：日落落在次日，rise < set（跨午夜 wrap 修复）", () => {
    // 旧 bug：set 归一化到 [0,1440) 后被 dt.plus 解释为当日凌晨（00:03），
    // 致 set < rise；修复后在 set<rise 时 set 补加 1440 分钟，落回正确的次日。
    const ms = DateTime.fromISO("2026-06-21T12:00:00Z").toMillis();
    const { rise, set } = sunRiseSet(64.1466, -21.9426, "Atlantic/Reykjavik", ms);
    expect(rise).not.toBeNull();
    expect(set).not.toBeNull();
    expect(rise!.toMillis()).toBeLessThan(set!.toMillis());
    // 白昼时长应 > 20 小时（近极昼夏至），而非 21 分钟（wrap 后的错误时长）
    const dayLenMs = set!.toMillis() - rise!.toMillis();
    expect(dayLenMs).toBeGreaterThan(20 * 3600_000);
  });

  it(" Helsinki 夏至（现有数据最高纬度）：rise < set，无 wrap", () => {
    const ms = DateTime.fromISO("2026-06-21T12:00:00Z").toMillis();
    const { rise, set } = sunRiseSet(60.1699, 24.9384, "Europe/Helsinki", ms);
    expect(rise!.toMillis()).toBeLessThan(set!.toMillis());
  });
});
