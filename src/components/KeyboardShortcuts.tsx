"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";

/**
 * 全局键盘快捷键（6.10）。
 *
 * - Delete：删除当前主地点（光标/焦点不在输入框时，需二次确认）
 * - Escape：清除选区
 * - Ctrl/Cmd+Enter：把游标对齐到选区起点（确认选区起点）
 *
 * 方向键移动游标、Shift+方向键微调选区边缘 见 CursorBar。
 *
 * 注意：删除主地点走 window.confirm 二次确认（键盘流保持原生弹窗，
 * PlacesPanel 的按钮流用应用内 Dialog——两条路径都需确认，避免误按
 * 导致基准地点静默丢失）。不再绑定 Backspace（高频键，易误触）。
 */
export default function KeyboardShortcuts() {
  const t = useTranslations("Places");
  const removePlace = useWorldTimeStore((s) => s.removePlace);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const setCursor = useWorldTimeStore((s) => s.setCursor);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Delete 主地点（需二次确认）
      if (e.key === "Delete" && homeId) {
        e.preventDefault();
        if (!window.confirm(t("confirmRemoveHome"))) return;
        removePlace(homeId);
        return;
      }
      // Escape 清除选区；对话框/菜单/浮层组打开时把 Esc 留给其关闭，
      // 避免连带清空选区（三者均仅在打开时挂载，无永久命中）
      if (e.key === "Escape") {
        if (document.querySelector('[role="dialog"], [role="menu"], [role="group"]')) return;
        setSelection(null);
        return;
      }
      // Ctrl/Cmd+Enter：把游标对齐到当前选区起点
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const sel = useWorldTimeStore.getState().selection;
        if (sel) {
          e.preventDefault();
          setCursor(sel.startMs);
        }
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [t, removePlace, homeId, setSelection, setCursor]);

  return null;
}
