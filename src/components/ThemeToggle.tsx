"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { IconSun, IconMoon } from "./icons";
import { useViewTransition } from "@/lib/useViewTransition";

/** 明暗主题切换（6.8）。两个 SVG 图标绝对堆叠，按当前主题交叉淡入 + 轻微旋转，切换更具反馈感。
 *  图标随 currentColor 着色（继承 icon-btn 的 text-muted），跨平台渲染一致。
 *
 *  科技 premium：切换包裹原生 View Transitions，以点击点为圆心做圆形扩散擦除
 *  （见 globals.css ::view-transition-new(root)）。不支持 / reduced-motion 时自动
 *  退化为 next-themes 的平滑切换。 */
export default function ThemeToggle() {
  const t = useTranslations("Theme");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const runTransition = useViewTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // 避免 SSR/CSR 不一致：占位宽度与 icon-btn 一致，防布局抖动
    return <span className="inline-block w-7" aria-hidden />;
  }

  const current = theme === "system" ? resolvedTheme : theme;
  const next = current === "dark" ? "light" : "dark";

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    // 以点击点为圆心：写入视口坐标 CSS 变量，供 vt-reveal 圆形 clip-path 使用
    const x = e.clientX;
    const y = e.clientY;
    const root = document.documentElement;
    root.style.setProperty("--vt-x", `${x}px`);
    root.style.setProperty("--vt-y", `${y}px`);
    // flushSync：在 View Transition 回调内同步提交 React 状态（next-themes 据此
    // 切换 <html> 上的 .dark），使过渡能捕获真实 DOM 变化做圆形揭示。所有分支
    // （支持 / 抛错回退 / 不支持）均保证 setTheme 执行，功能不丢失。
    runTransition(() => {
      flushSync(() => setTheme(next));
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
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
