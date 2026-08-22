"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePresence } from "@/lib/usePresence";
import GlassMenu from "./GlassMenu";
import CursorBar from "./CursorBar";
import DateJump from "./DateJump";
import { IconSliders } from "./icons";

/**
 * 「视图选项」弹层：时间游标与日期跳转两个低频控件的统一入口。
 *
 * 把它们从首屏工具条降级到这里，工具条只剩「图例色点 ｜ ‹ 今天 › ｜ ⚙」；
 * 键盘快捷键不受弹层开合影响（useCursorShortcuts 在 GridToolbar 全局挂载）。
 *
 * 可访问性：Esc / 外部点击关闭，关闭后焦点还给触发按钮，
 * aria-haspopup / aria-expanded 同步按钮状态。
 */
export default function ViewOptions() {
  const t = useTranslations("ViewControls");
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  // 弹层进/出过渡
  const presence = usePresence(open, 200);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !btnRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={t("title")}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t("title")}
        onClick={() => setOpen((o) => !o)}
        data-testid="view-options"
        className="icon-btn md:!h-7 md:!w-7"
      >
        <IconSliders className="h-4 w-4" />
      </button>

      {presence.mounted && (
        <GlassMenu
          ref={panelRef}
          anchorRef={btnRef}
          align="end"
          width={248}
          data-state={presence.state}
          role="dialog"
          aria-modal="false"
          aria-label={t("title")}
          className="motion-pop space-y-3 p-3"
        >
          <div>
            <DateJump />
          </div>
          <div className="border-t border-line pt-3">
            <CursorBar />
          </div>
        </GlassMenu>
      )}
    </div>
  );
}
