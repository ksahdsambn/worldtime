"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { IconSun, IconMoon } from "./icons";

/** 明暗主题切换（6.8）。两个 SVG 图标绝对堆叠，按当前主题交叉淡入 + 轻微旋转，切换更具反馈感。
 *  图标随 currentColor 着色（继承 icon-btn 的 text-muted），跨平台渲染一致。 */
export default function ThemeToggle() {
  const t = useTranslations("Theme");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // 避免 SSR/CSR 不一致：占位宽度与 icon-btn 一致，防布局抖动
    return <span className="inline-block w-7" aria-hidden />;
  }

  const current = theme === "system" ? resolvedTheme : theme;

  return (
    <button
      type="button"
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
      data-testid="theme-toggle"
      className="icon-btn"
      title={t("toggle")}
      aria-label={t("toggle")}
    >
      <span className="relative block h-4 w-4 leading-none">
        {/* 太阳：暗色主题下显示 */}
        <IconSun
          className="absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-300 ease-[var(--ease-out-quint)]"
          style={{
            opacity: current === "dark" ? 1 : 0,
            transform:
              current === "dark" ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.6)",
          }}
        />
        {/* 月亮：亮色主题下显示 */}
        <IconMoon
          className="absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-300 ease-[var(--ease-out-quint)]"
          style={{
            opacity: current === "light" ? 1 : 0,
            transform:
              current === "light" ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.6)",
          }}
        />
      </span>
    </button>
  );
}
