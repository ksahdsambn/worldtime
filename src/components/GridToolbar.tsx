"use client";

import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { useLiquidGlass } from "@/lib/useLiquidGlass";
import HeatmapLegend from "./HeatmapLegend";
import WeekPager from "./WeekPager";
import NowButton from "./NowButton";
import ViewOptions from "./ViewOptions";
import { useCursorShortcuts } from "./CursorBar";

/**
 * 网格工具条：图例色点 ｜ 周翻页 · 回到现在 · 视图选项。
 *
 * 减法重构：三色图例只剩色点（完整语义在 title 与 Help 弹窗）；
 * 时间游标与日期跳转收进「视图选项」弹层；「今天 / 回到现在」合并为一个
 * 主按钮（重置窗口起点并滚到当前时刻）。
 *
 * 空状态（无任何城市）时整体隐藏：这些控件在没有网格时全部失效，
 * 隐藏它们让首屏富空状态聚焦，首座城市加入即恢复。
 * 游标键盘快捷键在此全局挂载，与弹层开合无关。
 */
export default function GridToolbar() {
  const places = useWorldTimeStore((s) => s.places);
  const glassRef = useLiquidGlass();
  // 键盘 ←/→ 移动游标、Shift+←/→ 微调选区边缘、Enter 起选区：
  // 挂在工具条层级，即使「视图选项」关闭也保持可用（深度用户路径零回归）。
  useCursorShortcuts();
  if (places.length === 0) return null;

  return (
    <div
      ref={glassRef}
      className="animate-fade-in liquid-glass liquid-glass--bar flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5"
    >
      <HeatmapLegend />
      <div className="flex items-center gap-1">
        <WeekPager />
        <span className="divider" />
        <NowButton />
        <ViewOptions />
      </div>
    </div>
  );
}
