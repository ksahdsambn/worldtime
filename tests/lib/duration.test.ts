import { describe, it, expect } from "vitest";
import { formatDuration, type DurationWords } from "@/lib/duration";

// 中文与英文的 DurationWords，与 messages 中 Selection 命名空间一致
const ZH: DurationWords = {
  hour: "小时",
  hours: "小时",
  minute: "分钟",
  minutes: "分钟",
  zero: "0分钟",
  sep: "",
};
const EN: DurationWords = {
  hour: "hour",
  hours: "hours",
  minute: "minute",
  minutes: "minutes",
  zero: "0 minutes",
  sep: " ",
};

describe("formatDuration (TC-12 选区时长)", () => {
  it("中文：一小时三十分钟（验收第 15 条）", () => {
    expect(formatDuration(90 * 60_000, ZH)).toBe("1小时30分钟");
  });
  it("英文：1 hour 30 minutes", () => {
    expect(formatDuration(90 * 60_000, EN)).toBe("1 hour 30 minutes");
  });
  it("整小时中文：两小时", () => {
    expect(formatDuration(120 * 60_000, ZH)).toBe("2小时");
  });
  it("英文单数：1 hour", () => {
    expect(formatDuration(60 * 60_000, EN)).toBe("1 hour");
  });
  it("仅分钟：30 分钟", () => {
    expect(formatDuration(30 * 60_000, ZH)).toBe("30分钟");
    expect(formatDuration(30 * 60_000, EN)).toBe("30 minutes");
  });
  it("零时长", () => {
    expect(formatDuration(0, ZH)).toBe("0分钟");
    expect(formatDuration(0, EN)).toBe("0 minutes");
  });
  it("四舍五入到分钟", () => {
    expect(formatDuration(90_000, ZH)).toBe("2分钟");
  });
  it("新增语言（如西语）单复数正确", () => {
    // 验证函数与 locale 解耦：传入西语单位词即得到正确格式
    const ES: DurationWords = {
      hour: "hora",
      hours: "horas",
      minute: "minuto",
      minutes: "minutos",
      zero: "0 minutos",
      sep: " ",
    };
    expect(formatDuration(90 * 60_000, ES)).toBe("1 hora 30 minutos");
    expect(formatDuration(120 * 60_000, ES)).toBe("2 horas");
  });
});
