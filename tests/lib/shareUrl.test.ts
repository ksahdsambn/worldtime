import { describe, it, expect } from "vitest";
import { encodeState, decodeState } from "@/lib/shareUrl";
import { PLACES } from "../helpers";

describe("shareUrl 编解码 round-trip", () => {
  it("空状态编解码", () => {
    const q = encodeState([], null, null);
    expect(q).toBe("");
    const { places, homeId, selection } = decodeState(q);
    expect(places).toHaveLength(0);
    expect(homeId).toBeNull();
    expect(selection).toBeNull();
  });

  it("地点列表（含主地点标记）round-trip", () => {
    const beijing = PLACES.beijing();
    const ny = PLACES.newYork();
    const q = encodeState([beijing, ny], "cn-beijing", null);
    expect(q).toContain("p=");
    expect(q).toContain("*cn-beijing");
    const { places, homeId } = decodeState(q);
    expect(places.map((p) => p.id)).toEqual(["cn-beijing", "us-new-york"]);
    expect(homeId).toBe("cn-beijing");
  });

  it("主地点非首项时仍正确标记", () => {
    const beijing = PLACES.beijing();
    const ny = PLACES.newYork();
    const q = encodeState([beijing, ny], "us-new-york", null);
    const { homeId } = decodeState(q);
    expect(homeId).toBe("us-new-york");
  });

  it("选区 round-trip", () => {
    const beijing = PLACES.beijing();
    const sel = { startMs: 1700000000000, endMs: 1700003600000 };
    const q = encodeState([beijing], "cn-beijing", sel);
    expect(q).toContain("s=1700000000000-1700003600000");
    const { selection } = decodeState(q);
    expect(selection).toEqual(sel);
  });

  it("无主地点标记时默认取首项", () => {
    const beijing = PLACES.beijing();
    const q = encodeState([beijing], null, null);
    // homeId 传入 null，但 encodeState 仍会编码（不带 *），解码时默认首项
    const { homeId } = decodeState(q);
    expect(homeId).toBe("cn-beijing");
  });

  it("非法 city id 被跳过（不报错）", () => {
    const q = "p=cn-beijing,fake-city,us-new-york";
    const { places } = decodeState(q);
    expect(places.map((p) => p.id)).toEqual(["cn-beijing", "us-new-york"]);
  });

  it("非法选区格式被忽略", () => {
    const q = "p=cn-beijing&s=not-a-number";
    const { selection } = decodeState(q);
    expect(selection).toBeNull();
  });

  it("固定查看时刻 round-trip（t 参数）", () => {
    const beijing = PLACES.beijing();
    const pinned = 1700000000000;
    const q = encodeState([beijing], "cn-beijing", null, pinned);
    expect(q).toContain("t=1700000000000");
    expect(q).not.toContain("c=");
    const { pinnedMs } = decodeState(q);
    expect(pinnedMs).toBe(pinned);
  });

  it("无固定时刻时 pinnedMs 为 null", () => {
    const q = encodeState([], null, null);
    const { pinnedMs } = decodeState(q);
    expect(pinnedMs).toBeNull();
  });

  it("非法时刻格式被忽略", () => {
    expect(decodeState("t=not-a-number").pinnedMs).toBeNull();
  });

  /**
   * 旧版兼容：时间游标 c= 参数仍可读取，映射为 pinnedMs；
   * 新链接不再写出 c=。两者同时存在时 t= 优先。
   */
  it("旧版游标 c= 兼容读取为 pinnedMs", () => {
    const { pinnedMs } = decodeState("c=1700000000000");
    expect(pinnedMs).toBe(1700000000000);
  });

  it("t 与 c 同时存在时 t 优先", () => {
    const { pinnedMs } = decodeState("t=111&c=222");
    expect(pinnedMs).toBe(111);
  });

  /**
   * 审查报告 P1：decodeState 必须拒绝反向选区（startMs > endMs）。
   * 旧实现只校验 \d+-\d+ 格式，不校验大小关系，导致下游显示负时长 / 生成
   * 无效日历事件（DTEND 早于 DTSTART）。
   */
  it("反向选区（startMs > endMs）被拒绝，selection 为 null", () => {
    expect(decodeState("s=2000-1000").selection).toBeNull();
  });

  it("正向选区正常解码", () => {
    expect(decodeState("s=1000-2000").selection).toEqual({
      startMs: 1000,
      endMs: 2000,
    });
  });

  it("相等起止被拒绝（起必须严格小于止）", () => {
    expect(decodeState("s=1000-1000").selection).toBeNull();
  });

  it("差值超过 7 天上限被拒绝（防御极端值）", () => {
    const week = 7 * 24 * 3600_000;
    expect(decodeState(`s=1000-${1000 + week}`).selection).not.toBeNull();
    expect(decodeState(`s=1000-${1000 + week + 1}`).selection).toBeNull();
  });
});
