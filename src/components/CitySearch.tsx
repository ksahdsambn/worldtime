"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CITIES } from "@/data/cities";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import type { CityRecord } from "@/lib/types";
import { toast } from "@/lib/toast";

/**
 * 将时区与城市偏移（相对 UTC）格式化为 "+8 / -5" 风格。
 * 仅用于搜索结果展示，运行时偏移量计算在步骤 2.7。
 */
function describeOffset(city: CityRecord): string {
  try {
    const now = new Date();
    const local = new Intl.DateTimeFormat("en-US", {
      timeZone: city.timeZone,
      timeZoneName: "shortOffset",
    });
    const parts = local.formatToParts(now);
    const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
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

export default function CitySearch() {
  const t = useTranslations("CitySearch");
  const tCom = useTranslations("Common");
  const tPlaces = useTranslations("Places");
  const addPlace = useWorldTimeStore((s) => s.addPlace);
  const places = useWorldTimeStore((s) => s.places);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = "city-search-listbox";

  // 卸载时清理 blur 定时器，避免对已卸载组件 setState
  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  const results = useMemo<CityRecord[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const added = new Set(places.map((p) => p.id));

    // 匹配：中文名、英文名、国家中/英、IANA 时区标识、id（旧版把所有字段拼成一个串再
    // includes，结果按 nameEn 字母序排列，名字命中与国家/时区命中并列，相关性差——
    // 搜 "东京/Tokyo" 时名字匹配的城市应优先于时区里含这些字母的城市）。
    // 现按「字段优先级」排序：名字命中 < 国家命中 < 时区/id 命中；同级按 nameEn 字母序。
    const ranked = CITIES.filter((c) => {
      if (added.has(c.id)) return false;
      const nameHit =
        c.nameZh.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q);
      const countryHit =
        c.countryZh.toLowerCase().includes(q) ||
        c.countryEn.toLowerCase().includes(q);
      const zoneHit =
        c.timeZone.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);
      return nameHit || countryHit || zoneHit;
    }).map((c) => {
      const nameHit =
        c.nameZh.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q);
      const countryHit =
        c.countryZh.toLowerCase().includes(q) ||
        c.countryEn.toLowerCase().includes(q);
      // 优先级数值：0=名字命中，1=国家命中，2=仅时区/id 命中
      const rank = nameHit ? 0 : countryHit ? 1 : 2;
      return { c, rank };
    });

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
    <div className="relative w-full max-w-md">
      <input
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
          // 延迟关闭以允许点击下拉项
          if (blurTimer.current) clearTimeout(blurTimer.current);
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
        className="input w-full"
      />
      {open && query.trim() && (
        <ul
              id={listboxId}
              role="listbox"
              className="surface absolute z-20 mt-1 max-h-72 w-full overflow-auto p-1 shadow-lg"
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
                    className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm ${
                      i === highlight ? "bg-surface-hover" : ""
                    }`}
                  >
                    <span className="text-lg" aria-hidden>
                      {c.flag}
                    </span>
                    <span className="flex-1">
                      <span className="font-medium text-ink">{c.nameZh}</span>
                      <span className="ml-1 text-faint">({c.nameEn})</span>
                      <span className="block text-xs text-faint">
                        {c.countryZh} · {c.timeZone}
                      </span>
                    </span>
                    <span className="chip">UTC{describeOffset(c)}</span>
                <span className="sr-only">{tCom("add")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
