"use client";

import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { useLiquidGlass } from "@/lib/useLiquidGlass";
import HeatmapLegend from "./HeatmapLegend";
import WeekPager from "./WeekPager";
import NowButton from "./NowButton";

/**
 * 排期视图工具条：图例色点 ｜ 1天/7天 · ‹ › · 回到现在。
 *
 * 两态改造后的减法：日期跳转由网格日期表头点击（原生 picker）与
 * 时间控制条承担；视图选项弹层（时间游标/日期输入）随游标功能一并移除。
 *
 * 空状态（无任何城市）时整体隐藏：这些控件在没有网格时全部失效。
 */
export default function GridToolbar() {
  const places = useWorldTimeStore((s) => s.places);
  const glassRef = useLiquidGlass();
  if (places.length === 0) return null;

  return (
    <div
      ref={glassRef}
      className="animate-fade-in liquid-glass liquid-glass--bar flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5"
    >
      <HeatmapLegend />
      <div className="flex items-center gap-1">
        <DaySpanToggle />
        <span className="divider" />
        <WeekPager />
        <NowButton />
      </div>
    </div>
  );
}

/** 网格窗口跨度切换：1 天一屏放下无需横滚，7 天保留全景排期视角。 */
function DaySpanToggle() {
  const t = useTranslations("ViewControls");
  const gridDays = useWorldTimeStore((s) => s.gridDays);
  const setGridDays = useWorldTimeStore((s) => s.setGridDays);

  return (
    // 同 Workspace：不加 role="group"，避免常驻命中 Esc 清选区守卫
    <div className="seg seg--sm" data-testid="days-toggle">
      <button
        type="button"
        aria-pressed={gridDays === 1}
        onClick={() => setGridDays(1)}
        data-testid="days-1"
      >
        {t("day1")}
      </button>
      <button
        type="button"
        aria-pressed={gridDays === 7}
        onClick={() => setGridDays(7)}
        data-testid="days-7"
      >
        {t("day7")}
      </button>
    </div>
  );
}
