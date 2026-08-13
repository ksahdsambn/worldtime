"use client";

import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import HeatmapLegend from "./HeatmapLegend";
import DateJump from "./DateJump";
import CursorBar from "./CursorBar";
import NowButton from "./NowButton";
import PrintExport from "./PrintExport";

/**
 * 网格工具条（颜色图例 + 日期/游标/打印控件）。
 *
 * 空状态（无任何城市）时整体隐藏：这些控件在没有网格时全部失效，
 * 隐藏它们让首屏富空状态聚焦，首座城市加入即恢复。
 * （行为相当于 page.tsx 旧的内联工具条，只是改为 client 自隐藏。）
 */
export default function GridToolbar() {
  const places = useWorldTimeStore((s) => s.places);
  if (places.length === 0) return null;

  return (
    <div className="animate-fade-up glass-bar flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 no-print">
      <HeatmapLegend />
      <div className="flex flex-wrap items-center gap-1.5">
        <DateJump />
        <span className="divider" />
        <CursorBar />
        <NowButton />
        <span className="divider" />
        <PrintExport />
      </div>
    </div>
  );
}
