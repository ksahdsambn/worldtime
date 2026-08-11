"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import {
  requestInteractiveAuth,
  restoreGcalToken,
  disconnectGcal,
} from "@/lib/gcal-auth";

/**
 * Google 日历叠加（需求 6.1）—— 纯前端 Token Client 的 UI 入口。
 *
 * 鉴权逻辑（GIS 单例、静默刷新、断开、恢复）见 src/lib/gcal-auth.ts；
 * freebusy 拉取与投影见 src/lib/gcal.ts + TimeGrid。本组件只负责按钮交互与状态文案。
 *
 * 前置条件（缺一授权会失败，组件显示错误文案）：
 *  1. NEXT_PUBLIC_GOOGLE_CLIENT_ID 环境变量；
 *  2. OAuth client 的 Authorized JavaScript origins 含本站域名 + localhost；
 *  3. consent screen 加测试用户（calendar.readonly 为 sensitive scope）。
 */

export default function GoogleCalendarConnect() {
  const t = useTranslations("Gcal");
  const connected = useWorldTimeStore((s) => s.gcalConnected);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  // 挂载时从 sessionStorage 恢复 token（刷新页面后免重新点授权）。
  useEffect(() => {
    restoreGcalToken();
  }, []);

  async function connect() {
    setStatus("loading");
    const ok = await requestInteractiveAuth();
    setStatus(ok ? "idle" : "error");
  }

  async function disconnect() {
    await disconnectGcal();
    setStatus("idle");
  }

  if (connected) {
    return (
      <button
        type="button"
        onClick={disconnect}
        data-testid="gcal-disconnect"
        className="rounded border px-2 py-0.5 text-green-700 hover:bg-gray-100"
      >
        {t("connected")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-600">{t("label")}：</span>
      <button
        type="button"
        onClick={connect}
        disabled={status === "loading"}
        data-testid="gcal-connect"
        className="rounded border px-2 py-0.5 text-blue-700 hover:bg-gray-100 disabled:opacity-50"
      >
        {status === "loading" ? t("loading") : t("connect")}
      </button>
      {status === "error" && (
        <span className="text-red-600">{t("error")}</span>
      )}
    </div>
  );
}
