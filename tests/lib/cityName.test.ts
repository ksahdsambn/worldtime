import { describe, it, expect } from "vitest";
import { CITY_BY_ID } from "@/data/cities";
import { localCityName, localCountryName, cityCountryName } from "@/lib/cityName";

describe("localCityName / cityCountryName", () => {
  const beijing = CITY_BY_ID["cn-beijing"];

  it("中文 locale 城市名为中文", () => {
    expect(localCityName("zh", beijing)).toBe("北京");
    expect(localCityName("zh-Hant", beijing)).toBe("北京");
  });
  it("非中文 locale 城市名为英文", () => {
    expect(localCityName("en", beijing)).toBe("Beijing");
    expect(localCityName("ja", beijing)).toBe("Beijing");
  });
  it("cityCountryName 用国家字段而非城市名", () => {
    expect(cityCountryName("zh", beijing)).toBe("中国");
    expect(cityCountryName("en", beijing)).toBe("China");
    expect(cityCountryName("zh", beijing)).not.toBe(localCityName("zh", beijing));
  });
  it("localCountryName 读 nameZh/nameEn", () => {
    expect(localCountryName("zh", { nameZh: "日本", nameEn: "Japan" })).toBe("日本");
    expect(localCountryName("en", { nameZh: "日本", nameEn: "Japan" })).toBe("Japan");
  });
});
