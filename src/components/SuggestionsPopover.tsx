"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { usePresence } from "@/lib/usePresence";
import { findOverlapSlots, type OverlapSlot } from "@/lib/overlap";
import { buildColumns, todayStartMs } from "@/lib/grid";
import { formatDuration, defaultSep } from "@/lib/duration";
import { prefers12Hour } from "@/lib/time";
import { toLuxonLocale } from "@/lib/landingSlug";
import GlassMenu from "./GlassMenu";
import { IconSparkles, IconClose } from "./icons";
import type { AppLocale } from "@/i18n/routing";

const HOUR_MS = 3600_000;

/**
 * 推荐时段弹层：把「找共同时间」从扫热力图解码变成显性动作。
 *
 * 打开时基于主地点「今天起 7 天」计算全员共同可用窗口（findOverlapSlots，
 * 与网格着色同源）；点击某条即写入选区（列对齐，网格高亮一致），必要时把
 * 网格窗口跳到该时段所在日，SelectionBar 随之接续复制摘要 / 分享链接。
 *
 * 无障碍与浮层行为照抄 HelpPopover：ESC / 外部点击关闭，打开时聚焦关闭
 * 按钮、关闭后还焦触发器，role="dialog" 与 KeyboardShortcuts 的 Esc 守卫
 * 天然兼容。徽章为「色点 + 文字」，不裸靠颜色。
 */
export default function SuggestionsPopover() {
  const t = useTranslations("Suggestions");
  const tSel = useTranslations("Selection");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as AppLocale;
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const dayPeriods = useWorldTimeStore((s) => s.dayPeriods);
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const gridDays = useWorldTimeStore((s) => s.gridDays);
  const viewStartDateMs = useWorldTimeStore((s) => s.viewStartDateMs);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const setViewStartDate = useWorldTimeStore((s) => s.setViewStartDate);

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const presence = usePresence(open, 200);

  const home = useMemo(
    () => places.find((p) => p.id === homeId) ?? places[0] ?? null,
    [places, homeId],
  );

  // 惰性计算：仅打开时按当时真实「现在」求值（useNow 在 SSR/首挂载为 null，
  // 弹层本身只在客户端手势后出现，此处直接 Date.now() 即可）
  const slots = useMemo(() => {
    if (!open || !home) return [] as OverlapSlot[];
    return findOverlapSlots(places, dayPeriods, home.timeZone, Date.now());
    // 依赖 places/dayPeriods/home 引用；open 翻转即按新时刻重算
  }, [open, places, dayPeriods, home]);

  useEffect(() => {
    if (!open) return;
    const focusId = requestAnimationFrame(() => closeRef.current?.focus());
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !btnRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      cancelAnimationFrame(focusId);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  // 单人无「共同」可言：不足两城时不出入口（须在全部 hooks 之后早退）
  if (places.length < 2 || !home) return null;

  function applySlot(s: OverlapSlot) {
    setSelection({ startMs: s.startMs, endMs: s.endMs });
    // 时段不在当前网格窗口内时，把窗口起点跳到该时段所在日（主地点本地午夜）
    const winStart =
      viewStartDateMs ?? todayStartMs(home!.timeZone, Date.now());
    const cols = buildColumns(home!.timeZone, winStart, gridDays);
    const inWindow =
      cols.length > 0 &&
      s.startMs >= cols[0].ms &&
      s.endMs <= cols[cols.length - 1].ms + HOUR_MS;
    if (!inWindow) {
      const dayStart = DateTime.fromMillis(s.startMs, {
        zone: home!.timeZone,
      }).startOf("day");
      if (dayStart.isValid) setViewStartDate(dayStart.toMillis());
    }
    setOpen(false);
    btnRef.current?.focus();
  }

  // 主城市本地展示格式：与 TimeGrid 行一致的 12/24/mixed 规则
  const use12 =
    hourFormat === "12" ||
    (hourFormat === "mixed" && prefers12Hour(home.countryCode));
  const timeFmt = use12 ? "h:mm a" : "HH:mm";
  const luxonLoc = toLuxonLocale(locale);

  // 选区时长单位词：与 SelectionBar 同构
  const sep = defaultSep(locale);
  const durationWords = {
    hour: tSel("hour"),
    hours: tSel("hours"),
    minute: tSel("minute"),
    minutes: tSel("minutes"),
    zero: `0${sep}${tSel("minutes")}`,
    sep,
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid="suggested-times"
        className="btn-primary btn-sm shrink-0"
      >
        <IconSparkles className="h-3.5 w-3.5" aria-hidden />
        {t("button")}
      </button>

      {presence.mounted && (
        <GlassMenu
          ref={panelRef}
          anchorRef={btnRef}
          align="end"
          width={360}
          data-state={presence.state}
          role="dialog"
          aria-modal="false"
          aria-label={t("title")}
          className="motion-pop p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">{t("title")}</h2>
              <p className="mt-0.5 text-[11px] text-faint">{t("scope")}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => {
                setOpen(false);
                btnRef.current?.focus();
              }}
              aria-label={tCommon("close")}
              className="icon-btn !h-6 !w-6"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </div>

          {slots.length === 0 ? (
            <p className="max-w-[28ch] text-sm leading-relaxed text-muted">
              {t("empty")}
            </p>
          ) : (
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {slots.map((s) => {
                const dtStart = DateTime.fromMillis(s.startMs, {
                  zone: home!.timeZone,
                }).setLocale(luxonLoc);
                const dtEnd = DateTime.fromMillis(s.endMs, {
                  zone: home!.timeZone,
                }).setLocale(luxonLoc);
                return (
                  <button
                    key={`${s.tier}-${s.startMs}`}
                    type="button"
                    onClick={() => applySlot(s)}
                    data-testid="suggested-slot"
                    className="block w-full rounded-md px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                  >
                    <span className="block text-sm font-medium tabular-nums text-ink">
                      {dtStart.toFormat("MM-dd EEE")} ·{" "}
                      {dtStart.toFormat(timeFmt)} – {dtEnd.toFormat(timeFmt)}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                      <span
                        className="inline-block h-2 w-3.5 shrink-0 rounded-[2px] border border-line"
                        style={{
                          backgroundColor:
                            s.tier === "green"
                              ? "var(--heat-good)"
                              : "var(--heat-caution)",
                        }}
                        aria-hidden
                      />
                      {formatDuration(s.endMs - s.startMs, durationWords)}
                      <span aria-hidden>·</span>
                      {t(s.tier === "green" ? "allGreen" : "compromise")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </GlassMenu>
      )}
    </div>
  );
}
