"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { formatDuration, defaultSep } from "@/lib/duration";
import { summaryText } from "@/lib/summary";
import { encodeState, copyText } from "@/lib/shareUrl";
import { usePresence } from "@/lib/usePresence";
import { useLiquidGlass } from "@/lib/useLiquidGlass";
import type { AppLocale } from "@/i18n/routing";

/**
 * 选区操作栏：显示选区总时长（TC-12），并提供复制摘要（MS-3）、
 * 复制分享链接（MS-6）与清除选区。
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
  const pinnedMs = useWorldTimeStore((s) => s.pinnedMs);
  const locale = useLocale() as AppLocale;
  const [flash, setFlash] = useState<string | null>(null);
  const glassRef = useLiquidGlass();

  // 选区清除时延迟卸载，播放退出（下滑 + 淡出）。退出期间仍引用上一次的选区渲染。
  const presence = usePresence(!!selection, 320);
  const lastSel = useRef(selection);
  if (selection) lastSel.current = selection;

  if (!presence.mounted || !lastSel.current) return null;
  const sel = lastSel.current;

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
        locale,
      ),
    );
    if (ok) {
      setFlash("summary");
      setTimeout(() => setFlash(null), 1500);
    }
  }

  async function onCopyShare() {
    // 构建当前完整分享 URL（含固定查看时刻，在用户手势上下文中安全访问 window）。
    // 用渲染中的 sel（lastSel.current）而非 store 的 selection：选区清除后
    // 退场动画仍显示该栏约 320ms，此时 store.selection 已为 null，若用它编码
    // 会复制出「不含 s= 参数」的失效链接（审查报告 P3）。
    const q = encodeState(places, homeId, sel, pinnedMs);
    const url = `${window.location.origin}${window.location.pathname}${q ? "?" + q : ""}`;
    const ok = await copyText(url);
    if (ok) {
      setFlash("share");
      setTimeout(() => setFlash(null), 1500);
    }
  }

  return (
    <div className="safe-bottom sticky bottom-3 z-30 px-3">
      <div
        ref={glassRef}
        data-state={presence.state}
        className="motion-sheet liquid-glass mx-auto flex max-w-[1680px] flex-col gap-2 px-4 py-2.5 md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:gap-y-2"
      >
        <div className="flex shrink-0 items-baseline">
          <span
            className="chrono text-lg text-ink"
            data-testid="selection-duration"
          >
            {formatDuration(ms, durationWords)}
          </span>
        </div>

        {/*
          操作组：手机端单行横向滚动（overflow-x-auto + nowrap），避免动作
          换行成高块霸占视口；桌面端恢复右对齐。滚动条藏起保持视觉干净。
        */}
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:ml-auto md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
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
            className="btn-primary btn-sm shrink-0"
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
