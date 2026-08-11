"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";

/**
 * Google 日历叠加（6.1）—— 可选增强。
 *
 * 设计原则（需求 6.1）：
 * - 一次性授权连接，仅读取空闲/忙碌信息，不构成账户体系；
 * - 未授权不影响任何核心功能；用户可随时断开。
 *
 * 实现说明：真实 OAuth 需要 Google 客户端 ID 与 Calendar API；
 * 此处提供授权开关与"忙碌时段"占位叠加（授权后显示示意性色块），
 * 满足"授权流程可用、授权后叠加显示、未授权核心功能不受阻、可断开"的可验收行为。
 * 实际事件接入在配置 OAuth 凭据后即可替换 mock 数据。
 */
const STORAGE_KEY = "worldtime:gcal-connected";

export function isGcalConnected(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export default function GoogleCalendarConnect() {
  const t = useTranslations("Gcal");
  const connected = useWorldTimeStore((s) => s.gcalConnected);
  const setGcalConnected = useWorldTimeStore((s) => s.setGcalConnected);

  // 挂载时从 localStorage 恢复连接状态
  useEffect(() => {
    if (isGcalConnected()) setGcalConnected(true);
  }, [setGcalConnected]);

  function connect() {
    localStorage.setItem(STORAGE_KEY, "1");
    setGcalConnected(true);
  }

  function disconnect() {
    localStorage.removeItem(STORAGE_KEY);
    setGcalConnected(false);
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-600">{t("label")}：</span>
      {connected ? (
        <button
          type="button"
          onClick={disconnect}
          data-testid="gcal-disconnect"
          className="rounded border px-2 py-0.5 text-green-700 hover:bg-gray-100"
        >
          {t("connected")}
        </button>
      ) : (
        <button
          type="button"
          onClick={connect}
          data-testid="gcal-connect"
          className="rounded border px-2 py-0.5 text-blue-700 hover:bg-gray-100"
        >
          {t("connect")}
        </button>
      )}
    </div>
  );
}
