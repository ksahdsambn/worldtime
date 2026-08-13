"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useTranslations } from "next-intl";
import { CITY_BY_ID } from "@/data/cities";

/**
 * 世界时钟小组件（第七章 6.1）。
 * 通过查询参数配置：
 * - cities：逗号分隔的城市 id（如 cn-beijing,us-new-york）
 * - theme：light | dark
 * - hours：12 | 24
 */
export default function WorldClockWidget() {
  const t = useTranslations("Widget");
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
    let id: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };
    const start = () => {
      if (id !== null) return;
      setNow(Date.now()); // 回前台时立刻重新对齐，避免显示陈旧秒数
      id = setInterval(() => setNow(Date.now()), 1000);
    };
    // 页面切到后台时暂停 1s 轮询节电；回到前台恢复（Date.now 自校验，正确性不受影响）
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, []);

  const cities = params.cities
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => CITY_BY_ID[id])
    .filter(Boolean)
    .slice(0, 30); // 防御：畸形超长 cities 列表不至于渲染爆炸

  const dark = params.theme === "dark";
  const fmt = params.hours === "12" ? "h:mm:ss a" : "HH:mm:ss";

  return (
    <div
      data-testid="wc-widget"
      // 通过根元素的 .dark 类驱动令牌（globals.css 的 .dark { --surface… } 作用于
      // 本元素及其后代），从而用语义令牌替代历史的 bg-slate-800/bg-white 硬编码，
      // 同时仍由 ?theme= 参数控制明暗。
      className={`surface p-4 text-ink ${dark ? "dark" : ""}`}
      style={{ minWidth: 200 }}
    >
      <h2 className="text-gradient mb-2 text-sm font-bold">{t("worldClock")}</h2>
      <ul className="space-y-1 text-sm">
        {cities.length === 0 && <li className="text-faint">{t("worldClockEmpty")}</li>}
        {cities.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span>{c.flag}</span>
            <span className="flex-1">{c.nameEn}</span>
            <span className="chrono">{now ? DateTime.fromMillis(now, { zone: c.timeZone }).toFormat(fmt) : "--:--:--"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
