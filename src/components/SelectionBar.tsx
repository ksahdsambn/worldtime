"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { formatDuration, defaultSep } from "@/lib/duration";
import { buildIcs, downloadIcs, googleCalendarUrl, mailtoUrl, encodeEventCode } from "@/lib/calendar";
import { summaryText } from "@/lib/summary";
import { encodeState, copyText } from "@/lib/shareUrl";
import type { AppLocale } from "@/i18n/routing";

/**
 * 选区操作栏：显示选区总时长（TC-12），并提供清除、日历导出（MS-2）、
 * 复制摘要（MS-3）、复制分享链接（MS-6）。
 */
export default function SelectionBar() {
  const t = useTranslations("Selection");
  const tExp = useTranslations("Export");
  const tSum = useTranslations("Summary");
  const selection = useWorldTimeStore((s) => s.selection);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const cursorMs = useWorldTimeStore((s) => s.cursorMs);
  const locale = useLocale() as AppLocale;
  const [flash, setFlash] = useState<string | null>(null);
  // 仅在客户端挂载后才访问 window.location，避免渲染期直接引用导致 SSR 报错
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!selection) return null;
  const sel = selection;
  const eventCode = encodeEventCode(encodeState(places, homeId, sel));
  // origin 在客户端挂载后才有值；未就绪时 eventUrl 为空，事件链接暂不导航
  const eventUrl = origin ? `${origin}/${locale}/event/${eventCode}` : "";

  const ms = sel.endMs - sel.startMs;
  // 选区时长单位词：由 messages 提供单复数文案，分隔符按 locale 派生（中文无空格）
  const sep = defaultSep(locale);
  const durationWords = {
    hour: t("hour"),
    hours: t("hours"),
    minute: t("minute"),
    minutes: t("minutes"),
    zero: `0${sep}${t("minutes")}`,
    sep,
  };

  async function onCopySummary() {
    const ok = await copyText(
      summaryText(
        sel,
        places,
        hourFormat,
        { title: tSum("title"), homeSuffix: tSum("homeSuffix") },
        homeId,
      ),
    );
    if (ok) {
      setFlash("summary");
      setTimeout(() => setFlash(null), 1500);
    }
  }

  async function onCopyShare() {
    // 构建当前完整分享 URL（含游标，在用户手势上下文中安全访问 window）
    const q = encodeState(places, homeId, selection, cursorMs);
    const url = `${window.location.origin}${window.location.pathname}${q ? "?" + q : ""}`;
    const ok = await copyText(url);
    if (ok) {
      setFlash("share");
      setTimeout(() => setFlash(null), 1500);
    }
  }

  return (
    <div className="safe-bottom sticky bottom-3 z-30 px-3 no-print">
      <div className="surface animate-fade-up mx-auto flex max-w-[1680px] flex-col gap-2 px-4 py-2.5 shadow-lg md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:gap-y-2">
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="text-[11px] uppercase tracking-wide text-faint">
            {t("duration")}
          </span>
          <span
            className="text-base font-semibold tabular-nums text-ink"
            data-testid="selection-duration"
          >
            {formatDuration(ms, durationWords)}
          </span>
        </div>

        {/*
          操作组：手机端单行横向滚动（overflow-x-auto + nowrap），避免 7 个动作
          换行成高块霸占视口；桌面端恢复右对齐换行。滚动条藏起保持视觉干净。
        */}
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:ml-auto md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => downloadIcs("worldtime-meeting", buildIcs(sel, places))}
            data-testid="export-ics"
            className="btn-primary btn-sm shrink-0"
          >
            {tExp("ics")}
          </button>
          <a
            href={googleCalendarUrl(sel, places)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="export-google"
            className="btn-ghost btn-sm shrink-0"
          >
            {tExp("google")}
          </a>
          <a
            href={mailtoUrl(sel, places)}
            data-testid="export-email"
            className="btn-ghost btn-sm shrink-0"
          >
            {tExp("email")}
          </a>
          <a
            href={eventUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={eventUrl ? undefined : true}
            data-testid="event-page"
            className="btn-ghost btn-sm shrink-0"
          >
            {tExp("eventPage")}
          </a>
          <span className="divider shrink-0" />
          <button
            type="button"
            onClick={onCopySummary}
            data-testid="copy-summary"
            className="btn-ghost btn-sm shrink-0"
          >
            {flash === "summary" ? tExp("copied") : tExp("copySummary")}
          </button>
          <button
            type="button"
            onClick={onCopyShare}
            data-testid="copy-share"
            className="btn-ghost btn-sm shrink-0"
          >
            {flash === "share" ? tExp("copied") : tExp("shareLink")}
          </button>
          <span className="divider shrink-0" />
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="btn-ghost btn-sm shrink-0"
          >
            {t("clear")}
          </button>
        </div>
      </div>
    </div>
  );
}
