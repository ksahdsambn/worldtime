"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { usePresence } from "@/lib/usePresence";
import GlassMenu from "./GlassMenu";
import WeekPager from "./WeekPager";
import NowButton from "./NowButton";
import { IconSliders } from "./icons";

/**
 * 视图选项收纳（第四期：渐进式披露）。
 *
 * 「1 天 / 7 天」切换、周翻页（‹ ›）、「回到现在」合并收进本弹出菜单，
 * 排期工具栏主层级只留图例与推荐入口。沿用项目自研弹出菜单模式
 * （GlassMenu + Esc/外点关闭 + 关闭还焦触发器，照抄 HelpPopover 行为）。
 *
 * 无障碍：aria-haspopup / aria-expanded 同步按钮状态；菜单内控件均为原生
 * button（可展开后以 Tab 遍历，焦点顺序合理）；role="menu" 同时让全局
 * Esc 守卫（KeyboardShortcuts）把 Esc 留给菜单关闭，不连带清选区。
 */
export default function ViewOptionsMenu() {
  const t = useTranslations("ViewControls");
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const presence = usePresence(open, 200);

  useEffect(() => {
    if (!open) return;
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
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("viewOptions")}
        title={t("viewOptions")}
        onClick={() => setOpen((o) => !o)}
        data-testid="view-options"
        className="icon-btn"
      >
        <IconSliders className="h-4 w-4" />
      </button>

      {presence.mounted && (
        <GlassMenu
          ref={panelRef}
          anchorRef={btnRef}
          align="end"
          width={280}
          data-state={presence.state}
          role="menu"
          aria-label={t("viewOptions")}
          className="motion-pop p-3"
        >
          <div className="flex flex-col gap-3">
            {/* 跨度切换 + 周翻页：一行收纳 */}
            <div className="flex items-center justify-between gap-2">
              <DaySpanToggle />
              <WeekPager />
            </div>
            <div className="divider !mx-0" />
            <NowButton />
          </div>
        </GlassMenu>
      )}
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
