import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { CITY_BY_ID } from "@/data/cities";
import {
  buildCityNowFacts,
  citiesInCountry,
  countryCodesInIndex,
  convertersForCity,
  uniqueTimeZones,
  countryByCode,
} from "@/lib/cityFacts";

describe("buildCityNowFacts", () => {
  const now = DateTime.fromISO("2026-08-15T12:00:00Z").toMillis();

  it("北京 12:00Z 为 20:00 UTC+8", () => {
    const f = buildCityNowFacts("Asia/Shanghai", now, "en");
    expect(f.time).toBe("20:00");
    expect(f.offsetLabel).toBe("+8");
    expect(f.iana).toBe("Asia/Shanghai");
    expect(f.inDst).toBe(false);
  });
  it("日期字段非空", () => {
    const f = buildCityNowFacts("America/New_York", now, "en");
    expect(f.date.length).toBeGreaterThan(0);
    expect(f.inDst).toBe(true);
  });
});

describe("country / city index", () => {
  it("中国有多座城市", () => {
    expect(citiesInCountry("CN").length).toBeGreaterThan(10);
    expect(citiesInCountry("cn").every((c) => c.countryCode === "CN")).toBe(true);
  });
  it("countryCodesInIndex 含 CN/US/JP", () => {
    const codes = countryCodesInIndex();
    expect(codes).toContain("CN");
    expect(codes).toContain("US");
    expect(codes).toContain("JP");
  });
  it("convertersForCity 北京命中热门对", () => {
    const pairs = convertersForCity("cn-beijing");
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.some(([a, b]) => a === "cn-beijing" || b === "cn-beijing")).toBe(true);
  });
  it("uniqueTimeZones 去重", () => {
    const cities = [CITY_BY_ID["cn-beijing"], CITY_BY_ID["cn-shanghai"]];
    expect(uniqueTimeZones(cities)).toEqual(["Asia/Shanghai"]);
  });
  it("countryByCode 返回中英名", () => {
    expect(countryByCode("JP").nameEn).toBe("Japan");
    expect(countryByCode("jp").nameZh).toBe("日本");
  });
});
