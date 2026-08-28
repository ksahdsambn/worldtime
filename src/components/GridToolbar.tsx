"use client";

import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { useLiquidGlass } from "@/lib/useLiquidGlass";
import HeatmapLegend from "./HeatmapLegend";
import SuggestionsPopover from "./SuggestionsPopover";
import ViewOptionsMenu from "./ViewOptionsMenu";

/**
 * 排期视图工具条（第四期收纳后）：图例（色点+文字）｜ 推荐时段 · 视图选项。
 *
 * 渐进式披露：主层级只留读图必需的图例与推荐入口；「1 天 / 7 天」、
 * 周翻页、「回到现在」收进 ViewOptionsMenu 弹出菜单（键盘可达）。
 * 日期跳转由网格日期表头点击（原生 picker）与时间控制条承担。
 *
 * 空状态（无任何城市）时整体隐藏：这些控件在没有网格时全部失效。
 */
export default function GridToolbar() {
  const places = useWorldTimeStore((s) => s.places);
  const glassRef = useLiquidGlass();
  if (places.length === 0) return null;

  return (
    <div className="px-3 pt-2">
      <div
        ref={glassRef}
        className="animate-fade-in liquid-glass liquid-glass--deck flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5"
      >
        <HeatmapLegend />
        <div className="flex flex-wrap items-center gap-1">
          <SuggestionsPopover />
          <ViewOptionsMenu />
        </div>
      </div>
    </div>
  );
}
