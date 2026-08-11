import type { TimeZoneAbbreviationRecord } from "@/lib/types";

/**
 * 常用时区缩写对照表。
 * 关联 IANA 时区用于运行时取真实偏移与夏令时状态。
 * 同一缩写可能对应多个地区（如 CST 可为美国中部或中国标准时），
 * 此处取最常见的一项；运行时仍以 IANA 时区为准。
 */
export const TIME_ZONE_ABBREVIATIONS: TimeZoneAbbreviationRecord[] = [
  { abbr: "UTC", nameZh: "协调世界时", nameEn: "Coordinated Universal Time", timeZone: "UTC" },
  { abbr: "GMT", nameZh: "格林尼治标准时间", nameEn: "Greenwich Mean Time", timeZone: "Etc/GMT" },
  { abbr: "BST", nameZh: "英国夏令时", nameEn: "British Summer Time", timeZone: "Europe/London" },
  { abbr: "CET", nameZh: "中欧时间", nameEn: "Central European Time", timeZone: "Europe/Paris" },
  { abbr: "CEST", nameZh: "中欧夏令时", nameEn: "Central European Summer Time", timeZone: "Europe/Paris" },
  { abbr: "EET", nameZh: "东欧时间", nameEn: "Eastern European Time", timeZone: "Europe/Athens" },
  { abbr: "EEST", nameZh: "东欧夏令时", nameEn: "Eastern European Summer Time", timeZone: "Europe/Athens" },
  { abbr: "WET", nameZh: "西欧时间", nameEn: "Western European Time", timeZone: "Europe/Lisbon" },
  { abbr: "WEST", nameZh: "西欧夏令时", nameEn: "Western European Summer Time", timeZone: "Europe/Lisbon" },
  { abbr: "EST", nameZh: "美国东部标准时间", nameEn: "Eastern Standard Time", timeZone: "America/New_York" },
  { abbr: "EDT", nameZh: "美国东部夏令时", nameEn: "Eastern Daylight Time", timeZone: "America/New_York" },
  { abbr: "CST", nameZh: "美国中部标准时间", nameEn: "Central Standard Time", timeZone: "America/Chicago" },
  { abbr: "CDT", nameZh: "美国中部夏令时", nameEn: "Central Daylight Time", timeZone: "America/Chicago" },
  { abbr: "MST", nameZh: "美国山地标准时间", nameEn: "Mountain Standard Time", timeZone: "America/Denver" },
  { abbr: "MDT", nameZh: "美国山地夏令时", nameEn: "Mountain Daylight Time", timeZone: "America/Denver" },
  { abbr: "PST", nameZh: "太平洋标准时间", nameEn: "Pacific Standard Time", timeZone: "America/Los_Angeles" },
  { abbr: "PDT", nameZh: "太平洋夏令时", nameEn: "Pacific Daylight Time", timeZone: "America/Los_Angeles" },
  { abbr: "AKST", nameZh: "阿拉斯加标准时间", nameEn: "Alaska Standard Time", timeZone: "America/Anchorage" },
  { abbr: "AKDT", nameZh: "阿拉斯加夏令时", nameEn: "Alaska Daylight Time", timeZone: "America/Anchorage" },
  { abbr: "HST", nameZh: "夏威夷标准时间", nameEn: "Hawaii Standard Time", timeZone: "Pacific/Honolulu" },
  { abbr: "AST", nameZh: "大西洋标准时间", nameEn: "Atlantic Standard Time", timeZone: "America/Halifax" },
  { abbr: "ADT", nameZh: "大西洋夏令时", nameEn: "Atlantic Daylight Time", timeZone: "America/Halifax" },
  { abbr: "IST", nameZh: "印度标准时间", nameEn: "India Standard Time", timeZone: "Asia/Kolkata" },
  { abbr: "PKT", nameZh: "巴基斯坦时间", nameEn: "Pakistan Standard Time", timeZone: "Asia/Karachi" },
  { abbr: "BST_BD", nameZh: "孟加拉时间", nameEn: "Bangladesh Standard Time", timeZone: "Asia/Dhaka" },
  { abbr: "ICT", nameZh: "印度支那时间", nameEn: "Indochina Time", timeZone: "Asia/Bangkok" },
  { abbr: "WIB", nameZh: "印尼西部时间", nameEn: "Western Indonesia Time", timeZone: "Asia/Jakarta" },
  { abbr: "PHT", nameZh: "菲律宾时间", nameEn: "Philippine Time", timeZone: "Asia/Manila" },
  { abbr: "SGT", nameZh: "新加坡时间", nameEn: "Singapore Time", timeZone: "Asia/Singapore" },
  { abbr: "MYT", nameZh: "马来西亚时间", nameEn: "Malaysia Time", timeZone: "Asia/Kuala_Lumpur" },
  { abbr: "HKT", nameZh: "香港时间", nameEn: "Hong Kong Time", timeZone: "Asia/Hong_Kong" },
  { abbr: "CST_CN", nameZh: "中国标准时间", nameEn: "China Standard Time", timeZone: "Asia/Shanghai" },
  { abbr: "TW_T", nameZh: "台北时间", nameEn: "Taipei Time", timeZone: "Asia/Taipei" },
  { abbr: "JST", nameZh: "日本标准时间", nameEn: "Japan Standard Time", timeZone: "Asia/Tokyo" },
  { abbr: "KST", nameZh: "韩国标准时间", nameEn: "Korean Standard Time", timeZone: "Asia/Seoul" },
  { abbr: "AWST", nameZh: "澳大利亚西部时间", nameEn: "Australian Western Time", timeZone: "Australia/Perth" },
  { abbr: "ACST", nameZh: "澳大利亚中部时间", nameEn: "Australian Central Time", timeZone: "Australia/Adelaide" },
  { abbr: "AEST", nameZh: "澳大利亚东部时间", nameEn: "Australian Eastern Time", timeZone: "Australia/Sydney" },
  { abbr: "AEDT", nameZh: "澳大利亚东部夏令时", nameEn: "Australian Eastern Daylight Time", timeZone: "Australia/Sydney" },
  { abbr: "NZST", nameZh: "新西兰标准时间", nameEn: "New Zealand Standard Time", timeZone: "Pacific/Auckland" },
  { abbr: "NZDT", nameZh: "新西兰夏令时", nameEn: "New Zealand Daylight Time", timeZone: "Pacific/Auckland" },
  { abbr: "GST", nameZh: "海湾标准时间", nameEn: "Gulf Standard Time", timeZone: "Asia/Dubai" },
  { abbr: "TRT", nameZh: "土耳其时间", nameEn: "Turkey Time", timeZone: "Europe/Istanbul" },
  { abbr: "IRT", nameZh: "伊朗时间", nameEn: "Iran Time", timeZone: "Asia/Tehran" },
  { abbr: "MSK", nameZh: "莫斯科时间", nameEn: "Moscow Time", timeZone: "Europe/Moscow" },
  { abbr: "BRT", nameZh: "巴西利亚时间", nameEn: "Brasília Time", timeZone: "America/Sao_Paulo" },
  { abbr: "ART", nameZh: "阿根廷时间", nameEn: "Argentina Time", timeZone: "America/Argentina/Buenos_Aires" },
  { abbr: "CLT", nameZh: "智利时间", nameEn: "Chile Time", timeZone: "America/Santiago" },
  { abbr: "COT", nameZh: "哥伦比亚时间", nameEn: "Colombia Time", timeZone: "America/Bogota" },
  { abbr: "PET", nameZh: "秘鲁时间", nameEn: "Peru Time", timeZone: "America/Lima" },
  { abbr: "EAT", nameZh: "东非时间", nameEn: "East Africa Time", timeZone: "Africa/Nairobi" },
  { abbr: "CAT", nameZh: "中非时间", nameEn: "Central Africa Time", timeZone: "Africa/Maputo" },
  { abbr: "WAT", nameZh: "西非时间", nameEn: "West Africa Time", timeZone: "Africa/Lagos" },
  { abbr: "SAST", nameZh: "南非时间", nameEn: "South Africa Time", timeZone: "Africa/Johannesburg" },
  { abbr: "EGT", nameZh: "埃及时间", nameEn: "Egypt Time", timeZone: "Africa/Cairo" },
];

/**
 * 缩写 → 记录 映射（首个命中）。
 */
export const ABBR_BY_CODE: Record<string, TimeZoneAbbreviationRecord> =
  TIME_ZONE_ABBREVIATIONS.reduce(
    (acc, rec) => {
      if (!(rec.abbr in acc)) acc[rec.abbr] = rec;
      return acc;
    },
    {} as Record<string, TimeZoneAbbreviationRecord>,
  );
