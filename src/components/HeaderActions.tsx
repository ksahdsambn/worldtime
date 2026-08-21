"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import LocaleSwitcher from "./LocaleSwitcher";
import HelpPopover from "./HelpPopover";
import SettingsPanel from "./SettingsPanel";
import ThemeToggle from "./ThemeToggle";
import { usePresence } from "@/lib/usePresence";
import GlassMenu from "./GlassMenu";
import { IconMore } from "./icons";

/**
 * 顶栏次要操作簇：语言 · 帮助 · 设置 · 主题。
 *
 * 桌面端（≥md）常驻内联；手机端折叠进 "⋯" 弹出菜单，把顶栏横向空间让给
 * 品牌与城市搜索。组件按断点切换两套外壳，但内部操作只挂载一份。
 *
 * SSR 与首帧一律按桌面渲染（isDesktop 初值 true），与服务器一致以避免
 * hydration 不匹配；挂载后用 matchMedia 同步真实断点，移动端会再切到菜单外壳
 * （一次性、单帧，无可感知闪烁）。
 */
export default function HeaderActions() {
  const t = useTranslations("Common");
  const [isDesktop, setIsDesktop] = useState(true);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  // 移动端「⋯」菜单进/出过渡（桌面端不渲染此分支）
  const presence = usePresence(open, 200);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      const desktop = mql.matches;
      setIsDesktop(desktop);
      // 切回桌面端时关闭「⋯」折叠菜单：否则 open 状态残留，日后缩回移动端
      // 会直接弹出菜单（审查报告 P3）。
      if (desktop) setOpen(false);
    };
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  // Esc 关闭菜单
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (isDesktop) {
    return (
      <div className="ml-auto flex items-center gap-1.5">
        <LocaleSwitcher />
        <span className="divider" />
        <HelpPopover />
        <SettingsPanel />
        <ThemeToggle />
      </div>
    );
  }

  return (
    <div className="relative ml-auto shrink-0">
      <button
        ref={btnRef}
        type="button"
        aria-label={t("more")}
        aria-expanded={open}
        aria-controls="header-actions-menu"
        onClick={() => setOpen((o) => !o)}
        className="icon-btn"
      >
        <IconMore className="h-5 w-5" />
      </button>
      {presence.mounted && (
        <>
          {typeof document !== "undefined" &&
            createPortal(
              <div
                data-state={presence.state}
                className="motion-overlay fixed inset-0 z-40 bg-[var(--glass-scrim)]"
                onClick={() => setOpen(false)}
                aria-hidden
              />,
              document.body,
            )}
          {/*
            role=group（而非 menu）：内含 select 与混合按钮，并非严格 menuitem
            列表，group 语义更准确；aria-label 复用「更多」。
          */}
          <GlassMenu
            id="header-actions-menu"
            anchorRef={btnRef}
            align="end"
            width={224}
            data-state={presence.state}
            role="group"
            aria-label={t("more")}
            className="motion-pop p-3"
          >
            <div className="flex flex-col gap-3">
              <LocaleSwitcher />
              <span className="divider" />
              <div className="flex items-center gap-2">
                <HelpPopover />
                <SettingsPanel />
                <ThemeToggle />
              </div>
            </div>
          </GlassMenu>
        </>
      )}
    </div>
  );
}
