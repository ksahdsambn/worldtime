import { DateTime } from "luxon";
import { CITY_BY_ID } from "@/data/cities";
import { TIME_ZONE_ABBREVIATIONS } from "@/data/timeZoneAbbreviations";
import { localCityName } from "@/lib/cityName";
import type { AppLocale } from "@/i18n/routing";
import {
  diffOffsetMinutes,
  formatOffset,
  isDST,
  nextDSTChange,
  timeZoneAbbrev,
} from "@/lib/time";

export const LUXON_LOCALE: Record<string, string> = {
  zh: "zh-CN",
  "zh-Hant": "zh-TW",
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  ja: "ja",
  ko: "ko",
  pt: "pt-BR",
  ru: "ru",
  vi: "vi",
};

export function toLuxonLocale(locale: string): string {
  return LUXON_LOCALE[locale] ?? locale;
}

export interface PairInfo {
  kind: "city" | "tz";
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  aZone: string;
  bZone: string;
  aLabel: string;
  bLabel: string;
  diffMinutes: number;
}

export function parseSlug(slug: string): PairInfo | null {
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
        aId: a.abbr,
        bId: b.abbr,
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

  if (sepIndex >= 0) {
    const aId = slug.slice(0, sepIndex).toLowerCase();
    const bId = slug.slice(sepIndex + 2).toLowerCase();
    const a = CITY_BY_ID[aId];
    const b = CITY_BY_ID[bId];
    if (a && b) {
      return {
        kind: "city",
        aId,
        bId,
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

export interface ComparisonRow {
  aHour: string;
  bHour: string;
  bDay: string;
}

export interface ComparisonState {
  diffMinutes: number;
  rows: ComparisonRow[];
  updatedAt: string;
  aNow: string;
  bNow: string;
}

export function buildComparisonState(
  nowMs: number,
  aZone: string,
  bZone: string,
  locale = "en",
): ComparisonState {
  const luxonLoc = toLuxonLocale(locale);
  const rows: ComparisonRow[] = [];
  for (let h = 0; h < 24; h++) {
    const aDt = DateTime.fromMillis(nowMs, { zone: aZone })
      .startOf("day")
      .plus({ hours: h });
    const bDt = aDt.setZone(bZone).setLocale(luxonLoc);
    rows.push({
      aHour: aDt.toFormat("HH:mm"),
      bHour: bDt.toFormat("HH:mm"),
      bDay: bDt.toFormat("EEE"),
    });
  }
  const aNowDt = DateTime.fromMillis(nowMs, { zone: aZone });
  const bNowDt = DateTime.fromMillis(nowMs, { zone: bZone });
  return {
    diffMinutes: diffOffsetMinutes(aZone, bZone, nowMs),
    rows,
    updatedAt: DateTime.fromMillis(nowMs, { zone: "utc" }).toFormat(
      "yyyy-MM-dd HH:mm 'UTC'",
    ),
    aNow: aNowDt.toFormat("HH:mm"),
    bNow: bNowDt.toFormat("HH:mm"),
  };
}

export interface WorkSlot {
  aHour: string;
  bHour: string;
  aHourNum: number;
}

export function overlappingWorkHours(
  nowMs: number,
  aZone: string,
  bZone: string,
  workStart = 9,
  workEnd = 18,
): WorkSlot[] {
  const slots: WorkSlot[] = [];
  for (let h = 0; h < 24; h++) {
    const aDt = DateTime.fromMillis(nowMs, { zone: aZone })
      .startOf("day")
      .plus({ hours: h });
    const bDt = aDt.setZone(bZone);
    const aH = aDt.hour;
    const bH = bDt.hour;
    if (aH >= workStart && aH < workEnd && bH >= workStart && bH < workEnd) {
      slots.push({
        aHour: aDt.toFormat("HH:mm"),
        bHour: bDt.toFormat("HH:mm"),
        aHourNum: aH,
      });
    }
  }
  return slots;
}

export function collapseHourRanges(hours: number[]): Array<{ start: number; end: number }> {
  if (hours.length === 0) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: Array<{ start: number; end: number }> = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }
    ranges.push({ start, end: prev + 1 });
    start = sorted[i];
    prev = sorted[i];
  }
  ranges.push({ start, end: prev + 1 });
  return ranges;
}

export function formatHourRange(start: number, end: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(start)}:00–${pad(end)}:00`;
}

export interface ZoneDstFacts {
  inDst: boolean;
  nextMs: number | null;
  abbrev: string | null;
  observesDst: boolean;
  offsetLabel: string;
}

export function zoneDstFacts(zone: string, nowMs: number): ZoneDstFacts {
  const inDst = isDST(zone, nowMs);
  const nextMs = nextDSTChange(zone, nowMs);
  return {
    inDst,
    nextMs,
    abbrev: timeZoneAbbrev(zone, nowMs),
    observesDst: inDst || nextMs != null,
    offsetLabel: formatOffset(DateTime.fromMillis(nowMs, { zone }).offset),
  };
}

export function formatDstDate(ms: number, zone: string, locale: string): string {
  return DateTime.fromMillis(ms, { zone })
    .setLocale(toLuxonLocale(locale))
    .toFormat("yyyy-MM-dd");
}

export function localizedPairLabels(
  info: PairInfo,
  locale: AppLocale,
): { a: string; b: string } {
  if (info.kind === "city") {
    const a = CITY_BY_ID[info.aId];
    const b = CITY_BY_ID[info.bId];
    return {
      a: a ? localCityName(locale, a) : info.aLabel,
      b: b ? localCityName(locale, b) : info.bLabel,
    };
  }
  return { a: info.aLabel, b: info.bLabel };
}
