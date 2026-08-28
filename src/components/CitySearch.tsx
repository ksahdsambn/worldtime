"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CITIES } from "@/data/cities";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import type { CityRecord } from "@/lib/types";
import { localCityName, cityCountryName } from "@/lib/cityName";
import { isChineseLocale, type AppLocale } from "@/i18n/routing";
import { toast } from "@/lib/toast";
import { usePresence } from "@/lib/usePresence";
import GlassMenu from "./GlassMenu";
import { IconSearch } from "./icons";

/**
 * 偏移量格式化器缓存。
 *
 * Intl.DateTimeFormat 构造昂贵（解析 locale/选项、内部建表），而搜索结果列表每条
 * 都会调用一次 describeOffset（最多 50 条）。格式化器对同一 timeZone 可复用于任意
 * 日期（偏移随日期变化由 formatToParts 自行处理），故按 timeZone 缓存对象。
 */
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat | null>();
function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat | null {
  let f = offsetFormatterCache.get(timeZone);
  if (f !== undefined) return f;
  try {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
  } catch {
    f = null;
  }
  offsetFormatterCache.set(timeZone, f);
  return f;
}

/**
 * 将时区与城市偏移（相对 UTC）格式化为 "+8 / -5" 风格。
 * 仅用于搜索结果展示，运行时偏移量计算在步骤 2.7。
 */
function describeOffset(city: CityRecord): string {
  const f = getOffsetFormatter(city.timeZone);
  if (!f) return "";
  try {
    const parts = f.formatToParts(new Date());
    const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    // 纯 "GMT"（零偏移，如未来加入 UTC 城市）：与 "GMT+0" 一致展示为 +0，
    // 避免拼出 "UTCGMT"（审查报告 P3）。
    if (tz === "GMT") return "+0";
    // tz 形如 "GMT+8" / "GMT-05"
    const m = tz.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    if (m) {
      const h = parseInt(m[1], 10);
      const mm = m[2] ? parseInt(m[2], 10) : 0;
      const sign = h >= 0 ? "+" : "-";
      return mm > 0 ? `${sign}${Math.abs(h)}:${String(mm).padStart(2, "0")}` : `${sign}${Math.abs(h)}`;
    }
    return tz;
  } catch {
    return "";
  }
}

/**
 * 搜索索引：预计算每座城市的「小写字段串」，避免每次按键都对全部 1200+ 城市
 * 反复 .toLowerCase()（原实现每次查询 ~7200 次字符串小写化 + 两趟 filter/map）。
 * 模块加载时一次性构建，查询时仅做 includes 与单趟遍历。
 */
interface SearchEntry {
  c: CityRecord;
  nameZh: string;
  nameEn: string;
  countryZh: string;
  countryEn: string;
  timeZone: string;
  id: string;
}
const SEARCH_INDEX: SearchEntry[] = CITIES.map((c) => ({
  c,
  nameZh: c.nameZh.toLowerCase(),
  nameEn: c.nameEn.toLowerCase(),
  countryZh: c.countryZh.toLowerCase(),
  countryEn: c.countryEn.toLowerCase(),
  timeZone: c.timeZone.toLowerCase(),
  id: c.id.toLowerCase(),
}));

export default function CitySearch() {
  const t = useTranslations("CitySearch");
  const tCom = useTranslations("Common");
  const tPlaces = useTranslations("Places");
  const locale = useLocale() as AppLocale;
  const zhFirst = isChineseLocale(locale);
  const addPlace = useWorldTimeStore((s) => s.addPlace);
  const places = useWorldTimeStore((s) => s.places);
  const searchPulse = useWorldTimeStore((s) => s.searchPulse);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "city-search-listbox";
  // 下拉可见 = 聚焦/输入且非空查询；进出过渡由 presence 驱动
  const dropdownVisible = open && query.trim().length > 0;
  const presence = usePresence(dropdownVisible, 200);

  // 卸载时清理 blur 定时器，避免对已卸载组件 setState
  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  // 任务卡片引导（第三期）：searchPulse 自增时聚焦搜索框并短暂高亮，
  // 把「下一步：添加城市」变成显性动作。跳过初始值（0）避免首挂载误触发。
  useEffect(() => {
    if (searchPulse === 0) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setPulsing(true);
    const id = setTimeout(() => setPulsing(false), 2400);
    return () => clearTimeout(id);
  }, [searchPulse]);

  const results = useMemo<CityRecord[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const added = new Set(places.map((p) => p.id));

    // 匹配：中文名、英文名、国家中/英、IANA 时区标识、id（旧版把所有字段拼成一个串再
    // includes，结果按 nameEn 字母序排列，名字命中与国家/时区命中并列，相关性差——
    // 搜 "东京/Tokyo" 时名字匹配的城市应优先于时区里含这些字母的城市）。
    // 现按「字段优先级」排序：名字命中 < 国家命中 < 时区/id 命中；同级按 nameEn 字母序。
    // 单趟遍历预构建的小写索引，避免重复 toLowerCase 与 filter+map 双趟。
    const ranked: Array<{ c: CityRecord; rank: number }> = [];
    for (const e of SEARCH_INDEX) {
      if (added.has(e.c.id)) continue;
      const nameHit = e.nameZh.includes(q) || e.nameEn.includes(q);
      const countryHit = e.countryZh.includes(q) || e.countryEn.includes(q);
      if (nameHit) {
        ranked.push({ c: e.c, rank: 0 });
      } else if (countryHit) {
        ranked.push({ c: e.c, rank: 1 });
      } else if (e.timeZone.includes(q) || e.id.includes(q)) {
        ranked.push({ c: e.c, rank: 2 });
      }
    }
    ranked.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.c.nameEn.localeCompare(b.c.nameEn);
    });
    return ranked.slice(0, 50).map((r) => r.c);
  }, [query, places]);

  function handleSelect(city: CityRecord) {
    const added = addPlace(city);
    if (!added) {
      // 达到上限或重复：给出明确反馈（addPlace 在这两种情况返回 false）
      toast.error(tPlaces("limitReached"));
    }
    setQuery("");
    setOpen(false);
    setHighlight(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative w-full max-w-2xl" ref={anchorRef}>
      <div className={`cmd-search relative ${pulsing ? "search-pulse" : ""}`}>
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          maxLength={60}
          aria-expanded={open && query.trim().length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && query.trim() && results.length > 0
              ? `${listboxId}-opt-${highlight}`
              : undefined
          }
          value={query}
          aria-label={t("placeholder")}
          placeholder={t("placeholder")}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          className="input w-full pl-9"
        />
      </div>
      {presence.mounted && (
        <GlassMenu
          as="ul"
          anchorRef={anchorRef}
          matchAnchorWidth
          id={listboxId}
          role="listbox"
          data-state={presence.state}
          className="motion-pop motion-pop-left max-h-72 overflow-auto p-1"
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.length === 0 && (
            <li className="px-2.5 py-1.5 text-sm text-faint">{t("noResults")}</li>
          )}
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
            >
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => handleSelect(c)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm ${
                  i === highlight ? "glass-row-active" : ""
                }`}
              >
                <span className="text-lg" aria-hidden>
                  {c.flag}
                </span>
                <span className="flex-1">
                  <span className="font-medium text-ink">{localCityName(locale, c)}</span>
                  <span className="ml-1 text-faint">({zhFirst ? c.nameEn : c.nameZh})</span>
                  <span className="block text-xs text-faint">
                    {cityCountryName(locale, c)} · {c.timeZone}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted">
                  UTC{describeOffset(c)}
                </span>
                <span className="sr-only">{tCom("add")}</span>
              </button>
            </li>
          ))}
        </GlassMenu>
      )}
    </div>
  );
}
