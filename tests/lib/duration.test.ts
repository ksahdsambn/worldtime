import { describe, it, expect } from "vitest";
import { formatDuration } from "@/lib/duration";

describe("formatDuration (TC-12 选区时长)", () => {
  it("中文：一小时三十分钟（验收第 15 条）", () => {
    expect(formatDuration(90 * 60_000, "zh")).toBe("1小时30分钟");
  });
  it("英文：1 hour 30 minutes", () => {
    expect(formatDuration(90 * 60_000, "en")).toBe("1 hour 30 minutes");
  });
  it("整小时中文：两小时", () => {
    expect(formatDuration(120 * 60_000, "zh")).toBe("2小时");
  });
  it("英文单数：1 hour", () => {
    expect(formatDuration(60 * 60_000, "en")).toBe("1 hour");
  });
  it("仅分钟：30 分钟", () => {
    expect(formatDuration(30 * 60_000, "zh")).toBe("30分钟");
    expect(formatDuration(30 * 60_000, "en")).toBe("30 minutes");
  });
  it("零时长", () => {
    expect(formatDuration(0, "zh")).toBe("0分钟");
    expect(formatDuration(0, "en")).toBe("0 minutes");
  });
  it("四舍五入到分钟", () => {
    expect(formatDuration(90_000, "zh")).toBe("2分钟");
  });
});
