"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import {
  requestInteractiveAuth,
  restoreGcalToken,
  disconnectGcal,
} from "@/lib/gcal-auth";
import { toast } from "@/lib/toast";

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
  // busy 同时覆盖连接与断开两种操作，禁用按钮防连点（断开是异步：需等 GIS revoke）。
  const [busy, setBusy] = useState(false);
  const [errored, setErrored] = useState(false);

  // 挂载时从 sessionStorage 恢复 token（刷新页面后免重新点授权）。
  useEffect(() => {
    restoreGcalToken();
  }, []);

  async function connect() {
    setBusy(true);
    setErrored(false);
    const ok = await requestInteractiveAuth();
    setBusy(false);
    if (!ok) {
      setErrored(true);
      toast.error(t("error"));
    }
  }

  async function disconnect() {
    if (busy) return;
    setBusy(true);
    await disconnectGcal();
    setBusy(false);
  }

  if (connected) {
    return (
      <button
        type="button"
        onClick={disconnect}
        disabled={busy}
        data-testid="gcal-disconnect"
        className="btn-ghost btn-sm"
        title={t("disconnect")}
        aria-busy={busy || undefined}
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          aria-hidden
        />
        {busy ? t("loading") : t("connected")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <button
        type="button"
        onClick={connect}
        disabled={busy}
        data-testid="gcal-connect"
        className="btn-ghost btn-sm"
        aria-label={t("label")}
        aria-busy={busy || undefined}
      >
        {busy ? t("loading") : t("connect")}
      </button>
      {errored && <span className="text-red-500">{t("error")}</span>}
    </div>
  );
}
