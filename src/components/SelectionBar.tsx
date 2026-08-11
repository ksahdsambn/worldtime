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
    <div className="flex flex-wrap items-center gap-2 border-t bg-gray-50 px-4 py-2 text-sm">
      <span className="text-gray-600">{t("duration")}：</span>
      <span className="font-semibold text-gray-900" data-testid="selection-duration">
        {formatDuration(ms, durationWords)}
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => downloadIcs("worldtime-meeting", buildIcs(sel, places))}
          data-testid="export-ics"
          className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
        >
          {tExp("ics")}
        </button>
        <a
          href={googleCalendarUrl(sel, places)}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="export-google"
          className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
        >
          {tExp("google")}
        </a>
        <a
          href={mailtoUrl(sel, places)}
          data-testid="export-email"
          className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
        >
          {tExp("email")}
        </a>
        <a
          href={eventUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={eventUrl ? undefined : true}
          data-testid="event-page"
          className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
        >
          {tExp("eventPage")}
        </a>
        <button
          type="button"
          onClick={onCopySummary}
          data-testid="copy-summary"
          className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
        >
          {flash === "summary" ? tExp("copied") : tExp("copySummary")}
        </button>
        <button
          type="button"
          onClick={onCopyShare}
          data-testid="copy-share"
          className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
        >
          {flash === "share" ? tExp("copied") : tExp("shareLink")}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setSelection(null)}
        className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
      >
        {t("clear")}
      </button>
    </div>
  );
}
