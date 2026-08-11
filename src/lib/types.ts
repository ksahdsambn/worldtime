/**
 * WorldTime 共享类型定义
 */

/**
 * 城市数据记录。
 * 每条记录对应一个可被用户添加的地点。
 */
export interface CityRecord {
  /** 稳定唯一标识（slug，用于 URL 序列化与主地点标记） */
  id: string;
  /** 城市名（中文） */
  nameZh: string;
  /** 城市名（英文） */
  nameEn: string;
  /** 国家名（中文） */
  countryZh: string;
  /** 国家名（英文） */
  countryEn: string;
  /** ISO 3166-1 alpha-2 国家代码，用于查国家元数据（国旗、周末规则） */
  countryCode: string;
  /** 国旗 emoji（亦可由 countryCode 推导，便于冗余存储） */
  flag: string;
  /** IANA 时区标识，如 Asia/Shanghai */
  timeZone: string;
}

/**
 * 国家元数据：国旗与所在地区的实际休息日。
 * 休息日为 1~7（1=周一 … 7=周日），用于周末智能识别（TC-11）与热力图周末覆盖。
 */
export interface CountryRecord {
  /** ISO 3166-1 alpha-2 国家代码 */
  code: string;
  /** 国家名（中文） */
  nameZh: string;
  /** 国家名（英文） */
  nameEn: string;
  /** 国旗 emoji */
  flag: string;
  /**
   * 周几为休息日，元素取值 1~7（1=周一 … 7=周日）。
   * 多数国家为 [6, 7]（周六、周日）；中东部分国家为 [5, 6]（周五、周六）等。
   */
  weekendDays: number[];
}

/** 时区缩写对照（如 EST、PST、CST、BST）。 */
export interface TimeZoneAbbreviationRecord {
  /** 缩写大写形式，如 EST */
  abbr: string;
  /** 全称（中文） */
  nameZh: string;
  /** 全称（英文） */
  nameEn: string;
  /** 关联的 IANA 时区标识（用于运行时取真实偏移/夏令时） */
  timeZone: string;
}
