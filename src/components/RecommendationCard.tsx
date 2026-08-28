"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { findOverlapSlots, slotInView, type OverlapSlot } from "@/lib/overlap";
import { formatDuration, defaultSep } from "@/lib/duration";
import { prefers12Hour } from "@/lib/time";
import { toLuxonLocale } from "@/lib/landingSlug";
import { useNow } from "@/lib/useNow";
import { IconCheck } from "./icons";
import type { AppLocale } from "@/i18n/routing";

/**
 * 推荐结论卡（第四期：结论前置）——「先给答案、再给画布」。
 *
 * - 复用既有推荐算法 findOverlapSlots（与网格着色同源），不新写推荐逻辑；
 * - 门槛：城市数 ≥ 2 才渲染（单一城市不存在「共同时间」），否则不占位；
 * - 有推荐：一句自然语言给出最强结论 + 「选中这段」主操作（落选区）；
 * - 推荐不在当前视野（一天视图 / 翻到其它周）时，主操作自动切回七天视图
 *   并定位到推荐所在日期再落选区；
 * - 多候选：首选直接呈现，次选以紧凑 chip 陈列、可切换查看；
 * - 无推荐：如实说明冲突原因并引导调整（复用 Suggestions.empty），不隐藏；
 * - 位置：排期工具栏与网格之间；内容性表面保持不透明（hud-frame，无玻璃）。
 *
 * 无障碍：结论与档位均为文本（色点为纯装饰 aria-hidden，语义不裸靠颜色）；
 * 主操作与次选 chip 均为原生 button（键盘可达、焦点可见、aria-pressed 表达
 * 当前查看项）。
 */
export default function RecommendationCard() {
  const t = useTranslations("Suggestions");
  const tSel = useTranslations("Selection");
  const locale = useLocale() as AppLocale;
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const dayPeriods = useWorldTimeStore((s) => s.dayPeriods);
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const gridDays = useWorldTimeStore((s) => s.gridDays);
  const viewStartDateMs = useWorldTimeStore((s) => s.viewStartDateMs);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const setViewStartDate = useWorldTimeStore((s) => s.setViewStartDate);
  const setGridDays = useWorldTimeStore((s) => s.setGridDays);
  const [activeIdx, setActiveIdx] = useState(0);

  // 小时粒度刷新：跨天停留时推荐窗口随时间推进（避免展示过期候选）。
  // 挂载首帧为 null（SSR 安全），以真实「现在」兜底计算。
  const nowHour = useNow(3_600_000);

  const home = useMemo(
    () => places.find((p) => p.id === homeId) ?? places[0] ?? null,
    [places, homeId],
  );

  const slots = useMemo(() => {
    if (!home || places.length < 2) return [] as OverlapSlot[];
    return findOverlapSlots(places, dayPeriods, home.timeZone, nowHour ?? Date.now());
    // 依赖 places/dayPeriods/home 引用；nowHour 按小时粒度触发重算
  }, [places, dayPeriods, home, nowHour]);

  // 单人无「共同」可言：不足两城时不占位（在全部 hooks 之后早退）
  if (places.length < 2 || !home) return null;

  // slots 更新（城市/时段变化）后夹紧索引，避免悬挂越界
  const idx = Math.min(activeIdx, Math.max(slots.length - 1, 0));
  const active = slots[idx] ?? null;

  // 主城市本地展示格式：与 TimeGrid 行一致的 12/24/mixed 规则
  const use12 =
    hourFormat === "12" ||
    (hourFormat === "mixed" && prefers12Hour(home.countryCode));
  const timeFmt = use12 ? "h:mm a" : "HH:mm";
  const luxonLoc = toLuxonLocale(locale);

  // 选区时长单位词：与 SelectionBar / SuggestionsPopover 同构
  const sep = defaultSep(locale);
  const durationWords = {
    hour: tSel("hour"),
    hours: tSel("hours"),
    minute: tSel("minute"),
    minutes: tSel("minutes"),
    zero: `0${sep}${tSel("minutes")}`,
    sep,
  };

  function luxon(ms: number): DateTime {
    return DateTime.fromMillis(ms, { zone: home!.timeZone }).setLocale(luxonLoc);
  }

  function fmtDay(ms: number): string {
    return luxon(ms).toFormat("MM-dd EEE");
  }

  function fmtTimeRange(s: OverlapSlot): string {
    return `${luxon(s.startMs).toFormat(timeFmt)} – ${luxon(s.endMs).toFormat(timeFmt)}`;
  }

  function applySlot(s: OverlapSlot) {
    setSelection({ startMs: s.startMs, endMs: s.endMs });
    // 时段不在当前网格视野内时：切回七天视图并定位到该时段所在日（主地点本地午夜）
    if (!slotInView(s, home!.timeZone, viewStartDateMs, gridDays, Date.now())) {
      if (gridDays !== 7) setGridDays(7);
      const dayStart = luxon(s.startMs).startOf("day");
      if (dayStart.isValid) setViewStartDate(dayStart.toMillis());
    }
  }

  return (
    <section
      className="hud-frame animate-fade-in mx-3 mb-2 mt-2 px-4 py-3.5 md:mx-4"
      data-testid="recommendation-card"
      aria-label={t("title")}
    >
      {active ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">
                {t("conclusion", {
                  day: fmtDay(active.startMs),
                  time: fmtTimeRange(active),
                })}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted">
                <span
                  className="inline-block h-2 w-3.5 shrink-0 rounded-[2px] border border-line"
                  style={{
                    backgroundColor:
                      active.tier === "green"
                        ? "var(--heat-good)"
                        : "var(--heat-caution)",
                  }}
                  aria-hidden
                />
                {formatDuration(active.endMs - active.startMs, durationWords)}
                <span aria-hidden>·</span>
                {t(active.tier === "green" ? "allGreen" : "compromise")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => applySlot(active)}
              data-testid="recommendation-apply"
              className="btn-primary btn-sm shrink-0"
            >
              <IconCheck className="h-3.5 w-3.5" aria-hidden />
              {t("apply")}
            </button>
          </div>

          {/* 多候选：次选以紧凑 chip 陈列、可切换查看 */}
          {slots.length > 1 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-faint">{t("more")}</span>
              {slots.map((s, i) => (
                <button
                  key={`${s.tier}-${s.startMs}`}
                  type="button"
                  aria-pressed={i === idx}
                  onClick={() => setActiveIdx(i)}
                  data-testid={`recommendation-chip-${i}`}
                  className="recommendation-chip"
                >
                  {fmtDay(s.startMs)} {fmtTimeRange(s)}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        // 无任何可用推荐：如实说明冲突原因并引导调整，不隐藏该区域
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted">
          {t("empty")}
        </p>
      )}
    </section>
  );
}
