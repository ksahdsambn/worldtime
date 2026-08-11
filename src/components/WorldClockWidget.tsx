"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { CITY_BY_ID } from "@/data/cities";

/**
 * 世界时钟小组件（第七章 6.1）。
 * 通过查询参数配置：
 * - cities：逗号分隔的城市 id（如 cn-beijing,us-new-york）
 * - theme：light | dark
 * - hours：12 | 24
 */
export default function WorldClockWidget() {
  const [now, setNow] = useState<number | null>(null);
  const [params, setParams] = useState<{ cities: string; theme: string; hours: string }>({
    cities: "",
    theme: "light",
    hours: "24",
  });

  // 仅客户端读取查询参数（避免 SSR/CSR 不一致）
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setParams({
      cities: p.get("cities") || "",
      theme: p.get("theme") || "light",
      hours: p.get("hours") || "24",
    });
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cities = params.cities
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => CITY_BY_ID[id])
    .filter(Boolean);

  const dark = params.theme === "dark";
  const fmt = params.hours === "12" ? "h:mm:ss a" : "HH:mm:ss";

  return (
    <div
      data-testid="wc-widget"
      className={`rounded-lg border p-4 ${dark ? "bg-slate-800 text-slate-100" : "bg-white text-gray-900"}`}
      style={{ minWidth: 200 }}
    >
      <h2 className="mb-2 text-sm font-bold">World Clock</h2>
      <ul className="space-y-1 text-sm">
        {cities.length === 0 && <li className="text-gray-500">?cities=...</li>}
        {cities.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span>{c.flag}</span>
            <span className="flex-1">{c.nameEn}</span>
            <span className="font-mono tabular-nums">
              {now ? DateTime.fromMillis(now, { zone: c.timeZone }).toFormat(fmt) : "--:--:--"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
