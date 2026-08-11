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

  it("游标 cursorMs round-trip（c 参数）", () => {
    const beijing = PLACES.beijing();
    const cursor = 1700000000000;
    const q = encodeState([beijing], "cn-beijing", null, cursor);
    expect(q).toContain("c=1700000000000");
    const { cursorMs } = decodeState(q);
    expect(cursorMs).toBe(cursor);
  });

  it("无游标时 cursorMs 为 null", () => {
    const q = encodeState([], null, null);
    const { cursorMs } = decodeState(q);
    expect(cursorMs).toBeNull();
  });

  it("非法游标格式被忽略", () => {
    const q = "c=not-a-number";
    const { cursorMs } = decodeState(q);
    expect(cursorMs).toBeNull();
  });
});
