"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import type { PlaceItem } from "@/store/useWorldTimeStore";

/**
 * 时间游标控制（TC-3 / TC-4，P1）。
 *
 * - 方向键 ←/→ 移动游标（默认 1 小时步进；Shift = 5 分钟步进）。
 * - 选中选区后，Shift+←/→ 微调选区起止边缘（5 分钟步进）。
 * - 点击"启用游标"初始化游标到当前时刻。
 *
 * 游标锚定到绝对时刻，所有地点行同步对齐（步骤 3.2）。
 */
export default function CursorBar() {
  const t = useTranslations("Cursor");
  const cursorMs = useWorldTimeStore((s) => s.cursorMs);
  const setCursor = useWorldTimeStore((s) => s.setCursor);
  const selection = useWorldTimeStore((s) => s.selection);
  const resizeSelection = useWorldTimeStore((s) => s.resizeSelection);
  const places = useWorldTimeStore((s) => s.places);
  // 通过 hook 订阅 homeId，确保主地点变更时组件重渲染
  const homeId = useWorldTimeStore((s) => s.homeId);

  const home: PlaceItem | undefined =
    places.find((p) => p.id === homeId) ?? places[0];

  // 键盘快捷键
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 输入框中不触发
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
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
  }, [cursorMs, selection, resizeSelection, setCursor]);

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
    <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-600">
      <span>{t("cursor")}：</span>
      {cursorMs == null ? (
        <button
          type="button"
          onClick={enableCursor}
          data-testid="enable-cursor"
          className="rounded border px-2 py-0.5 hover:bg-gray-100"
        >
          {t("enable")}
        </button>
      ) : (
        <>
          <span className="font-mono font-semibold" data-testid="cursor-time">
            {label}
          </span>
          <span className="text-gray-400">
            · ←/→ {t("move")} · Shift+←/→ {t("resize")}
          </span>
          <button
            type="button"
            onClick={() => setCursor(null)}
            data-testid="disable-cursor"
            className="rounded border px-2 py-0.5 hover:bg-gray-100"
            title={t("disable")}
          >
            {t("disable")}
          </button>
        </>
      )}
    </div>
  );
}
