"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

/** 明暗主题切换（6.8）。两个 emoji 绝对堆叠，按当前主题交叉淡入 + 轻微旋转，切换更具反馈感。 */
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
      className="icon-btn text-base"
      title={t("toggle")}
      aria-label={t("toggle")}
    >
      <span className="relative block leading-none">
        {/* 太阳：暗色主题下显示 */}
        <span
          aria-hidden
          className="absolute inset-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out-quint)]"
          style={{
            opacity: current === "dark" ? 1 : 0,
            transform:
              current === "dark" ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.6)",
          }}
        >
          ☀️
        </span>
        {/* 月亮：亮色主题下显示 */}
        <span
          aria-hidden
          className="absolute inset-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out-quint)]"
          style={{
            opacity: current === "light" ? 1 : 0,
            transform:
              current === "light" ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.6)",
          }}
        >
          🌙
        </span>
        {/* 流内占位，维持按钮尺寸（两个 emoji 均绝对定位不占空间）*/}
        <span className="invisible" aria-hidden>
          ☀️
        </span>
      </span>
    </button>
  );
}
