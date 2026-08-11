import type { CityRecord } from "@/lib/types";
import type { PlaceItem } from "@/store/useWorldTimeStore";

/**
 * 测试用辅助：按城市元数据构造 PlaceItem（tags 为空）。
 * 不依赖完整城市数据库，便于精准控制测试输入。
 */
export function makePlace(c: Partial<CityRecord> & Pick<CityRecord, "id" | "timeZone" | "countryCode">): PlaceItem {
  return {
    id: c.id,
    nameZh: c.nameZh ?? "测试城市",
    nameEn: c.nameEn ?? "Test City",
    countryZh: c.countryZh ?? "测试国",
    countryEn: c.countryEn ?? "Testland",
    countryCode: c.countryCode,
    flag: c.flag ?? "🏳️",
    timeZone: c.timeZone,
    tags: [],
  };
}

/** 常用测试地点。 */
export const PLACES = {
  beijing: () =>
    makePlace({
      id: "cn-beijing",
      nameZh: "北京",
      nameEn: "Beijing",
      countryZh: "中国",
      countryEn: "China",
      countryCode: "CN",
      flag: "🇨🇳",
      timeZone: "Asia/Shanghai",
    }),
  newYork: () =>
    makePlace({
      id: "us-new-york",
      nameZh: "纽约",
      nameEn: "New York",
      countryZh: "美国",
      countryEn: "United States",
      countryCode: "US",
      flag: "🇺🇸",
      timeZone: "America/New_York",
    }),
  london: () =>
    makePlace({
      id: "gb-london",
      nameZh: "伦敦",
      nameEn: "London",
      countryZh: "英国",
      countryEn: "United Kingdom",
      countryCode: "GB",
      flag: "🇬🇧",
      timeZone: "Europe/London",
    }),
  // 周末为周五、周六（沙特）
  riyadh: () =>
    makePlace({
      id: "sa-riyadh",
      nameZh: "利雅得",
      nameEn: "Riyadh",
      countryZh: "沙特阿拉伯",
      countryEn: "Saudi Arabia",
      countryCode: "SA",
      flag: "🇸🇦",
      timeZone: "Asia/Riyadh",
    }),
  // 半小时偏移时区（印度 +5:30）
  mumbai: () =>
    makePlace({
      id: "in-mumbai",
      nameZh: "孟买",
      nameEn: "Mumbai",
      countryZh: "印度",
      countryEn: "India",
      countryCode: "IN",
      flag: "🇮🇳",
      timeZone: "Asia/Kolkata",
    }),
  // 含逗号的城市名（用于 RFC5545 TEXT 转义测试）
  washington: () =>
    makePlace({
      id: "us-washington-dc",
      nameZh: "华盛顿",
      nameEn: "Washington, D.C.",
      countryZh: "美国",
      countryEn: "United States",
      countryCode: "US",
      flag: "🇺🇸",
      timeZone: "America/New_York",
    }),
};
