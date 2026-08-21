import { DateTime } from "luxon";
import type { CityRecord } from "@/lib/types";
import { CITIES, CITY_BY_ID } from "@/data/cities";
import { COUNTRIES, getCountry } from "@/data/countries";
import { formatOffset, nextDSTChange, timeZoneAbbrev } from "@/lib/time";
import { POPULAR_CITY_PAIRS } from "@/lib/seo";
import { toLuxonLocale } from "@/lib/landingSlug";

export interface CityNowFacts {
  time: string;
  date: string;
  offsetLabel: string;
  offsetMinutes: number;
  inDst: boolean;
  nextDstMs: number | null;
  abbrev: string | null;
  iana: string;
}

export function buildCityNowFacts(
  timeZone: string,
  nowMs: number,
  locale: string,
): CityNowFacts {
  const dt = DateTime.fromMillis(nowMs, { zone: timeZone }).setLocale(toLuxonLocale(locale));
  return {
    time: dt.toFormat("HH:mm"),
    date: dt.toFormat("cccc, d LLLL yyyy"),
    offsetLabel: formatOffset(dt.offset),
    offsetMinutes: dt.offset,
    inDst: dt.isInDST,
    nextDstMs: nextDSTChange(timeZone, nowMs),
    abbrev: timeZoneAbbrev(timeZone, nowMs),
    iana: timeZone,
  };
}

export function citiesInCountry(code: string): CityRecord[] {
  const upper = code.toUpperCase();
  return CITIES.filter((c) => c.countryCode === upper);
}

export function countryCodesInIndex(): string[] {
  return [...new Set(CITIES.map((c) => c.countryCode))].sort();
}

export function popularCountryCodes(): string[] {
  const codes = new Set<string>();
  for (const [a, b] of POPULAR_CITY_PAIRS) {
    const ca = CITY_BY_ID[a];
    const cb = CITY_BY_ID[b];
    if (ca) codes.add(ca.countryCode);
    if (cb) codes.add(cb.countryCode);
  }
  return [...codes].sort();
}

export function convertersForCity(cityId: string): Array<readonly [string, string]> {
  return POPULAR_CITY_PAIRS.filter(([a, b]) => a === cityId || b === cityId);
}

export function countryByCode(code: string) {
  return COUNTRIES[code.toUpperCase()] ?? getCountry(code.toUpperCase());
}

export function uniqueTimeZones(cities: CityRecord[]): string[] {
  return [...new Set(cities.map((c) => c.timeZone))].sort();
}
