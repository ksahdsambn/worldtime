"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "./LocaleSwitcher";
import HelpPopover from "./HelpPopover";
import SettingsPanel from "./SettingsPanel";
import ThemeToggle from "./ThemeToggle";
import GoogleCalendarConnect from "./GoogleCalendarConnect";
import { usePresence } from "@/lib/usePresence";
import { IconMore } from "./icons";

/**
 * 顶栏次要操作簇：语言 · 帮助 · 设置 · 主题 · Google 日历。
 *
 * 桌面端（≥md）常驻内联；手机端折叠进 "⋯" 弹出菜单，把顶栏横向空间让给
 * 品牌与城市搜索。组件按断点切换两套外壳，但内部操作只挂载一份，避免
 * GoogleCalendarConnect 等带状态的组件被重复挂载。
 *
 * SSR 与首帧一律按桌面渲染（isDesktop 初值 true），与服务器一致以避免
 * hydration 不匹配；挂载后用 matchMedia 同步真实断点，移动端会再切到菜单外壳
 * （一次性、单帧，无可感知闪烁）。
 */
export default function HeaderActions() {
  const t = useTranslations("Common");
  const [isDesktop, setIsDesktop] = useState(true);
  const [open, setOpen] = useState(false);
  // 移动端「⋯」菜单进/出过渡（桌面端不渲染此分支）
  const presence = usePresence(open, 200);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mql.matches);
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
        <GoogleCalendarConnect />
      </div>
    );
  }

  return (
    <div className="relative ml-auto shrink-0">
      <button
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
          {/* 遮罩：点击关闭 */}
          <div
            data-state={presence.state}
            className="motion-overlay fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/*
            role=group（而非 menu）：内含 select 与混合按钮，并非严格 menuitem
            列表，group 语义更准确；aria-label 复用「更多」。
          */}
          <div
            id="header-actions-menu"
            data-state={presence.state}
            role="group"
            aria-label={t("more")}
            className="motion-pop surface absolute right-0 top-full z-50 mt-1 w-56 p-3 shadow-lg"
          >
            <div className="flex flex-col gap-3">
              <LocaleSwitcher />
              <span className="divider" />
              <div className="flex items-center gap-2">
                <HelpPopover />
                <SettingsPanel />
                <ThemeToggle />
              </div>
              <GoogleCalendarConnect />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
