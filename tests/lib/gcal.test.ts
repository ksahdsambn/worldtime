import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { buildColumns } from "@/lib/grid";
import { busyRangesToMs, freeBusyWindow } from "@/lib/gcal";

describe("freeBusyWindow", () => {
  it("返回 RFC3339 区间，跨度等于给定天数", () => {
    const start = DateTime.fromISO("2026-08-12T00:00:00", { zone: "utc" }).toMillis();
    const w = freeBusyWindow(start, 7);
    expect(w.timeMin).toBe("2026-08-12T00:00:00.000Z");
    const diffMs = Date.parse(w.timeMax) - Date.parse(w.timeMin);
    expect(diffMs).toBe(7 * 24 * 3_600_000);
  });
});

describe("busyRangesToMs", () => {
  // 普通日（无 DST）：Asia/Shanghai 2026-08-12，单日 24 列
  const start = DateTime.fromISO("2026-08-12T00:00:00", { zone: "Asia/Shanghai" }).toMillis();
  const cols = buildColumns("Asia/Shanghai", start, 1);
  const colAt = (h: number) => cols.find((c) => c.homeHour === h)!;

  it("空区间 → 空集", () => {
    expect(busyRangesToMs([], cols).size).toBe(0);
  });

  it("完全覆盖一列的区间仅标记该列", () => {
    const col = colAt(10);
    const set = busyRangesToMs(
      [{ startMs: col.ms, endMs: col.ms + 3_600_000 }],
      cols,
    );
    expect(set.has(col.ms)).toBe(true);
    expect(set.size).toBe(1);
  });

  it("区间与列相切（恰好相接，不重叠）不标记", () => {
    const col = colAt(10);
    // 区间 [11:00, 12:00) 与列 [10:00, 11:00) 相接不相交
    const set = busyRangesToMs(
      [{ startMs: col.ms + 3_600_000, endMs: col.ms + 2 * 3_600_000 }],
      cols,
    );
    expect(set.has(col.ms)).toBe(false);
  });

  it("跨多小时的区间标记所有覆盖到的列", () => {
    // 区间 [09:00, 12:30) 覆盖 9/10/11/12 四列
    const set = busyRangesToMs(
      [{ startMs: colAt(9).ms, endMs: colAt(12).ms + 1_800_000 }],
      cols,
    );
    expect(set.size).toBe(4);
    for (const h of [9, 10, 11, 12]) expect(set.has(colAt(h).ms)).toBe(true);
    expect(set.has(colAt(13).ms)).toBe(false);
  });

  it("部分覆盖一列（半小时）也标记该列", () => {
    const col = colAt(10);
    // 区间 [10:30, 11:00) 落在列 [10:00, 11:00) 内
    const set = busyRangesToMs(
      [{ startMs: col.ms + 1_800_000, endMs: col.ms + 3_600_000 }],
      cols,
    );
    expect(set.has(col.ms)).toBe(true);
  });

  it("只标记 columns 中真实存在的列，不插入幽灵 ms", () => {
    // 窗口之外的区间不应产生任何 ms
    const before = cols[0].ms;
    const set = busyRangesToMs(
      [{ startMs: before - 7_200_000, endMs: before - 3_600_000 }],
      cols,
    );
    expect(set.size).toBe(0);
  });

  it("多个区间合并标记", () => {
    const set = busyRangesToMs(
      [
        { startMs: colAt(9).ms, endMs: colAt(9).ms + 3_600_000 },
        { startMs: colAt(14).ms, endMs: colAt(14).ms + 3_600_000 },
      ],
      cols,
    );
    expect(set.size).toBe(2);
    expect(set.has(colAt(9).ms)).toBe(true);
    expect(set.has(colAt(14).ms)).toBe(true);
  });
});
