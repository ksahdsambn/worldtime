"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import HeatmapLegend from "./HeatmapLegend";
import { usePresence } from "@/lib/usePresence";

/**
 * 应用内「提示」帮助浮层（新访客自助 + 老用户常驻）。
 *
 * 顶栏 ? 入口；紧凑无障碍浮层：三步上手 + 颜色图例 + 键盘快捷键。
 * 一处常驻、永不丢失的指引之家——一次性提示被关掉后，帮助仍在此处。
 *
 * 无障碍：ESC / 外部点击关闭，打开时聚焦关闭按钮，焦点环始终可见，
 * aria-haspopup / aria-expanded 同步按钮状态。
 */
export default function HelpPopover() {
  const t = useTranslations("Help");
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // 浮层进/出过渡
  const presence = usePresence(open, 200);

  useEffect(() => {
    if (!open) return;
    // 打开时聚焦关闭按钮，便于键盘用户立刻定位
    closeRef.current?.focus();

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

  const steps: Array<{ title: string; body: string }> = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
  ];
  const shortcuts: Array<{ keys: string; label: string }> = [
    { keys: "Delete", label: t("shortcutDelete") },
    { keys: "Esc", label: t("shortcutEscape") },
    { keys: "Ctrl/⌘ + Enter", label: t("shortcutEnter") },
  ];

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={t("label")}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t("label")}
        onClick={() => setOpen((o) => !o)}
        className="icon-btn text-base font-semibold"
      >
        <span aria-hidden>?</span>
      </button>

      {presence.mounted && (
        <div
          ref={panelRef}
          data-state={presence.state}
          role="dialog"
          aria-modal="false"
          aria-label={t("title")}
          className="motion-pop surface absolute right-0 top-full z-40 mt-1 w-80 max-w-[calc(100vw-1.5rem)] p-4 shadow-lg no-print"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">{t("title")}</h2>
            <button
              ref={closeRef}
              type="button"
              onClick={() => {
                setOpen(false);
                btnRef.current?.focus();
              }}
              aria-label={t("close")}
              className="icon-btn !h-6 !w-6 text-xs"
            >
              ✕
            </button>
          </div>

          <ol className="space-y-2.5">
            {steps.map((s) => (
              <li key={s.title} className="text-sm">
                <p className="font-medium text-ink">{s.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-4 border-t border-line pt-3">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
              {t("legendTitle")}
            </h3>
            <HeatmapLegend />
          </div>

          <div className="mt-3 border-t border-line pt-3">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
              {t("shortcutsTitle")}
            </h3>
            <ul className="space-y-1.5 text-xs text-muted">
              {shortcuts.map((s) => (
                <li key={s.keys} className="flex items-baseline gap-2">
                  <kbd className="kbd">{s.keys}</kbd>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
