"use client";

import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { useLiquidGlass } from "@/lib/useLiquidGlass";
import TimeCards from "./TimeCards";
import TimeControlBar from "./TimeControlBar";
import TimeGrid from "./TimeGrid";
import GridToolbar from "./GridToolbar";
import SelectionBar from "./SelectionBar";
import FirstUseEmptyState from "./FirstUseEmptyState";
import RecommendationCard from "./RecommendationCard";
import DragHint from "./DragHint";
import { IconClock, IconGrid } from "./icons";

/**
 * 首页工作区：一页两态，按用户意图分流。
 *
 * - 时钟（默认）：时间卡列表——「现在 / 任意时刻，各地几点」，分钟级直读；
 * - 重叠时段：时间网格排期——拖拽选共同空闲段并分享（带 s= 的分享链接
 *   由 useUrlStateSync 自动落入本视图）。
 *
 * 工作条为玻璃 chrome：左模式小卡片、右时间控制条（实时/固定时刻）。
 * 恢复完成前显示轻量骨架；恢复后无城市则显示首用富空状态。
 */
export default function Workspace() {
  const t = useTranslations("Modes");
  const places = useWorldTimeStore((s) => s.places);
  const viewMode = useWorldTimeStore((s) => s.viewMode);
  const setViewMode = useWorldTimeStore((s) => s.setViewMode);
  const restored = useWorldTimeStore((s) => s.restored);
  const glassRef = useLiquidGlass();

  if (!restored) {
    return (
      <div className="site-shell flex w-full flex-1 flex-col px-3 md:px-4">
        <div className="hud-frame flex min-h-[40vh] items-center justify-center" aria-busy="true">
          <LoadingLabel />
        </div>
      </div>
    );
  }

  if (places.length === 0) {
    return <FirstUseEmptyState />;
  }

  return (
    <div className="site-shell flex min-w-0 w-full flex-1 flex-col">
      {/* 工作条：模式分段控件 + 时间控制条 */}
      <div
        ref={glassRef}
        className="liquid-glass liquid-glass--bar flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-none px-4 py-2.5"
      >
        {/* 不用 role="group"：该值被 KeyboardShortcuts 的 Esc 守卫视为「浮层打开」，
            常驻模式卡片会永久短路 Esc 清选区。按钮 aria-pressed 已表达状态。
            第 56 轮：分段胶囊改为小卡片 UI（.mode-cards），与首页任务卡同语言。 */}
        <div className="mode-cards" data-testid="mode-tabs">
          <button
            type="button"
            aria-pressed={viewMode === "clock"}
            onClick={() => setViewMode("clock")}
            data-testid="mode-clock"
          >
            <IconClock className="h-3.5 w-3.5" aria-hidden />
            {t("clock")}
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "overlap"}
            onClick={() => setViewMode("overlap")}
            data-testid="mode-overlap"
          >
            <IconGrid className="h-3.5 w-3.5" aria-hidden />
            {t("overlap")}
          </button>
        </div>
        <TimeControlBar />
      </div>

      {viewMode === "clock" ? (
        <TimeCards />
      ) : (
        <>
          <GridToolbar />
          {/* 结论前置（第四期）：先给答案、再给画布；<2 城时不占位。
              一次性拖选提示：新用户首访排期视图时出现，读过即不再出现。 */}
          <RecommendationCard />
          <DragHint />
          <div className="min-h-0 min-w-0 flex-1 p-3 md:p-4">
            <TimeGrid />
          </div>
          {/* 选区操作栏仅在排期视图出现：时钟态没有可操作的选区画布 */}
          <SelectionBar />
        </>
      )}
    </div>
  );
}

function LoadingLabel() {
  const tLoad = useTranslations("Loading");
  return (
    <span className="inline-flex items-center gap-3 text-sm text-muted">
      <span className="chrono-spinner" aria-hidden>
        <span className="chrono-spinner__ring" />
        <span className="chrono-spinner__ring chrono-spinner__ring--inner" />
        <span className="chrono-spinner__dot" />
      </span>
      {tLoad("label")}
    </span>
  );
}
