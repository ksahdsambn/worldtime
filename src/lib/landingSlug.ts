import { DateTime } from "luxon";
import { CITY_BY_ID } from "@/data/cities";
import { TIME_ZONE_ABBREVIATIONS } from "@/data/timeZoneAbbreviations";
import { diffOffsetMinutes } from "@/lib/time";

/**
 * SEO 着陆页 slug 解析（第五章 LP-1~5）。
 *
 * 从 time-converter/[slug]/page.tsx 抽取为纯函数，便于单元测试。
 *
 * slug 采用「--」（双连字符）作为两段分隔符，避免与城市 id 内的
 * 单连字符（如 cn-hohhot-east）冲突。形如：
 * - 城市对："cn-beijing--us-new-york"
 * - 时区缩写对："EST--PST"
 *
 * 兼容：旧式以单连字符拼接的缩写对（如 "EST-PST"）仍可解析，
 * 因为时区缩写不含连字符。
 */
export interface PairInfo {
  kind: "city" | "tz";
  aName: string;
  bName: string;
  aZone: string;
  bZone: string;
  aLabel: string;
  bLabel: string;
  diffMinutes: number;
}

/**
 * 解析 slug 为配对信息。
 *
 * 用「--」（双连字符）切分两段，保证城市 id 内的单连字符不被误切：
 * - 时区缩写对：两段均为全大写缩写，按 TIME_ZONE_ABBREVIATIONS 反查；
 * - 城市对：两段按 CITY_BY_ID 精确反查。
 *
 * 兼容旧式单连字符缩写对（缩写不含连字符，split("-") 安全）。
 * 无法识别时返回 null（调用方 notFound）。
 */
export function parseSlug(slug: string): PairInfo | null {
  // 1) 时区缩写对：优先用双连号切分；若无双连号则按单连号切分（缩写不含连字符，安全）
  //    缩写正则允许字母与下划线（如 BST_BD、CST_CN、TW_T 等消歧变体）。
  const sepIndex = slug.indexOf("--");
  const tzParts =
    sepIndex >= 0
      ? [slug.slice(0, sepIndex), slug.slice(sepIndex + 2)]
      : slug.split("-");
  if (
    tzParts.length === 2 &&
    /^[A-Z][A-Z_]{1,6}$/.test(tzParts[0]) &&
    /^[A-Z][A-Z_]{1,6}$/.test(tzParts[1])
  ) {
    const a = TIME_ZONE_ABBREVIATIONS.find((x) => x.abbr === tzParts[0]);
    const b = TIME_ZONE_ABBREVIATIONS.find((x) => x.abbr === tzParts[1]);
    if (a && b) {
      return {
        kind: "tz",
        aName: a.nameEn,
        bName: b.nameEn,
        aZone: a.timeZone,
        bZone: b.timeZone,
        aLabel: a.abbr,
        bLabel: b.abbr,
        diffMinutes: diffOffsetMinutes(a.timeZone, b.timeZone),
      };
    }
  }

  // 2) 城市对：必须以「--」分隔，按 id 精确反查（避免子串误匹配）
  if (sepIndex >= 0) {
    const aId = slug.slice(0, sepIndex).toLowerCase();
    const bId = slug.slice(sepIndex + 2).toLowerCase();
    const a = CITY_BY_ID[aId];
    const b = CITY_BY_ID[bId];
    if (a && b) {
      return {
        kind: "city",
        aName: `${a.nameEn}, ${a.countryEn}`,
        bName: `${b.nameEn}, ${b.countryEn}`,
        aZone: a.timeZone,
        bZone: b.timeZone,
        aLabel: a.nameEn,
        bLabel: b.nameEn,
        diffMinutes: diffOffsetMinutes(a.timeZone, b.timeZone),
      };
    }
  }

  return null;
}

/** 对照表一行：「A 地整点 → B 地时间与星期」。 */
export interface ComparisonRow {
  aHour: string;
  bHour: string;
  bDay: string;
}

/** 着陆页全部时间相关状态（时差、典型时段对照、生成时刻标注）。 */
export interface ComparisonState {
  diffMinutes: number;
  rows: ComparisonRow[];
  updatedAt: string;
}

/**
 * 计算对照页的时间相关状态。
 * 服务端（ISR 烘焙，供首帧 SSR/爬虫）与客户端（挂载后每分钟重算，
 * LandingComparison 组件）共用同一实现，保证二者输出一致、无水合差异。
 *
 * 动机（审查报告 P3）：原页面仅靠 ISR `revalidate=3600` 刷新，长尾页的
 * 「当前偏移 / 对照表日期」最多滞后 1 小时；客户端实时接管后纠偏。
 */
export function buildComparisonState(
  nowMs: number,
  aZone: string,
  bZone: string,
): ComparisonState {
  // diffMinutes 基于「当前」单一时刻；DST 切换日各小时偏移可能不同，仅作顶部概览，
  // 对照表逐行用 setZone 精确换算（与旧实现保持一致，避免行为回归）。
  const rows: ComparisonRow[] = [0, 6, 9, 12, 15, 18, 22].map((h) => {
    const aDt = DateTime.fromMillis(nowMs, { zone: aZone })
      .startOf("day")
      .plus({ hours: h });
    const bDt = aDt.setZone(bZone);
    return {
      aHour: aDt.toFormat("HH:mm"),
      bHour: bDt.toFormat("HH:mm"),
      bDay: bDt.toFormat("EEE"),
    };
  });
  return {
    diffMinutes: diffOffsetMinutes(aZone, bZone, nowMs),
    rows,
    updatedAt: DateTime.fromMillis(nowMs, { zone: "utc" }).toFormat(
      "yyyy-MM-dd HH:mm 'UTC'",
    ),
  };
}
