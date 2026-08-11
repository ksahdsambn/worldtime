import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  encodeEventCode,
  decodeEventCode,
  buildIcs,
  googleCalendarUrl,
  mailtoUrl,
  meetingDescription,
} from "@/lib/calendar";
import { PLACES } from "../helpers";

describe("base64 编解码 round-trip (encodeEventCode/decodeEventCode)", () => {
  const cases = [
    "",
    "a",
    "ab",
    "abc",
    "abcd",
    "Hello, 世界! 🌍",
    "p=cn-beijing,us-new-york&s=1-2",
    "x".repeat(255),
  ];
  for (const s of cases) {
    it(`round-trip: ${JSON.stringify(s).slice(0, 30)}`, () => {
      expect(decodeEventCode(encodeEventCode(s))).toBe(s);
    });
  }

  it("解码容忍缺失 padding（去 = 后再解）", () => {
    // "abc" 的 base64 是 "YWJj"（无 padding）；"abcd" 是 "YWJjZA=="
    expect(decodeEventCode("YWJj")).toBe("abc");
    expect(decodeEventCode("YWJjZA")).toBe("abcd");
  });

  it("URL 安全：+ / 被替换为 - _", () => {
    // 构造一个会产生 + / 的输入
    const encoded = encodeEventCode("???>>>???");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
  });
});

describe("buildIcs", () => {
  const selection = {
    startMs: DateTime.fromISO("2026-07-15T09:00:00", { zone: "utc" }).toMillis(),
    endMs: DateTime.fromISO("2026-07-15T10:00:00", { zone: "utc" }).toMillis(),
  };
  const places = [PLACES.beijing(), PLACES.newYork()];

  it("包含必要的 iCalendar 结构", () => {
    const ics = buildIcs(selection, places);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("VERSION:2.0");
  });

  it("DTSTART/DTEND 为 UTC 带时区标识（非浮动时间）", () => {
    const ics = buildIcs(selection, places);
    // 应含 20260715T090000Z 形式
    expect(ics).toMatch(/DTSTART:20260715T090000Z/);
    expect(ics).toMatch(/DTEND:20260715T100000Z/);
  });

  it("SUMMARY 含各地点名", () => {
    const ics = buildIcs(selection, places);
    expect(ics).toContain("Beijing");
    expect(ics).toContain("New York");
  });

  it("DESCRIPTION 含各地点本地时间", () => {
    const desc = meetingDescription(selection, places);
    expect(desc).toContain("Beijing:");
    expect(desc).toContain("New York:");
  });

  it("CRLF 换行", () => {
    expect(buildIcs(selection, places)).toContain("\r\n");
  });

  it("RFC5545 TEXT 转义：含逗号的城市名（Washington, D.C.）的逗号被转义", () => {
    const dc = PLACES.washington();
    const ics = buildIcs(selection, [dc]);
    // SUMMARY 中 "Washington, D.C." 的逗号应被转义为 \,
    expect(ics).toContain("Washington\\, D.C.");
    expect(ics).not.toMatch(/SUMMARY:[^\r\n]*Washington,[^\r\n]*D\.C\./);
  });
});

describe("googleCalendarUrl", () => {
  it("链接含 UTC dates 参数与 TEMPLATE action", () => {
    const selection = {
      startMs: DateTime.fromISO("2026-07-15T09:00:00Z").toMillis(),
      endMs: DateTime.fromISO("2026-07-15T10:00:00Z").toMillis(),
    };
    const url = googleCalendarUrl(selection, [PLACES.beijing()]);
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("dates=20260715T090000Z%2F20260715T100000Z");
  });
});

describe("mailtoUrl", () => {
  it("mailto: 带主题与正文", () => {
    const selection = {
      startMs: DateTime.fromISO("2026-07-15T09:00:00Z").toMillis(),
      endMs: DateTime.fromISO("2026-07-15T10:00:00Z").toMillis(),
    };
    const url = mailtoUrl(selection, [PLACES.beijing()]);
    expect(url.startsWith("mailto:?")).toBe(true);
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
  });
});
