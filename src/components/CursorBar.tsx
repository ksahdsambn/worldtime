"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import type { PlaceItem } from "@/store/useWorldTimeStore";

/**
 * 时间游标的键盘控制（TC-3 / TC-4，P1）——全局挂载，与入口弹层开合无关：
 *
 * - 方向键 ←/→ 移动游标（默认 1 小时步进；Shift = 5 分钟步进）。
 * - 选中选区后，Shift+←/→ 微调选区起止边缘（5 分钟步进）。
 * - Enter / Space：在游标处开始一个 1 小时选区（随后用 Shift+←/→ 扩展）。
 */
export function useCursorShortcuts() {
  const cursorMs = useWorldTimeStore((s) => s.cursorMs);
  const setCursor = useWorldTimeStore((s) => s.setCursor);
  const selection = useWorldTimeStore((s) => s.selection);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const resizeSelection = useWorldTimeStore((s) => s.resizeSelection);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 输入框中不触发
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Enter / Space：在游标处开始选区。焦点在按钮/链接上时放行，避免拦截其原生激活/导航。
      if (e.key === "Enter" || e.key === " ") {
        if (tag === "BUTTON" || tag === "A") return;
        if (cursorMs == null) return;
        e.preventDefault();
        setSelection({ startMs: cursorMs, endMs: cursorMs + 3600_000 });
        return;
      }

      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const stepMs = e.shiftKey ? 5 * 60_000 : 60 * 60_000;
      const dir = e.key === "ArrowRight" ? 1 : -1;

      // 选中选区 + Shift -> 微调边缘
      if (selection && e.shiftKey) {
        e.preventDefault();
        // 左移调 start，右移调 end（直觉：向内收紧/向外扩展）
        const edge = dir < 0 ? "start" : "end";
        resizeSelection(edge, dir * stepMs);
        return;
      }

      if (cursorMs == null) return;
      e.preventDefault();
      setCursor(cursorMs + dir * stepMs);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursorMs, selection, setSelection, resizeSelection, setCursor]);
}

/**
 * 时间游标的行内控件（渲染于「视图选项」弹层内）。
 * 启用后显示当前游标时刻；键盘操作见全局 useCursorShortcuts / Help 弹窗。
 */
export default function CursorBar() {
  const t = useTranslations("Cursor");
  const cursorMs = useWorldTimeStore((s) => s.cursorMs);
  const setCursor = useWorldTimeStore((s) => s.setCursor);
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);

  const home: PlaceItem | undefined =
    places.find((p) => p.id === homeId) ?? places[0];

  function enableCursor() {
    setCursor(Date.now());
  }

  const label =
    cursorMs != null && home
      ? DateTime.fromMillis(cursorMs, { zone: home.timeZone }).toFormat(
          "MM-dd HH:mm",
        )
      : null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>{t("cursor")}</span>
      {cursorMs == null ? (
        <button
          type="button"
          onClick={enableCursor}
          data-testid="enable-cursor"
          className="btn-ghost btn-sm"
        >
          {t("enable")}
        </button>
      ) : (
        <>
          <span className="chrono text-ink" data-testid="cursor-time">
            {label}
          </span>
          <button
            type="button"
            onClick={() => setCursor(null)}
            data-testid="disable-cursor"
            className="btn-ghost btn-sm"
            title={t("disable")}
          >
            {t("disable")}
          </button>
        </>
      )}
    </div>
  );
}
