import type { Config } from "tailwindcss";

/**
 * 语义化设计令牌（Semantic design tokens）。
 *
 * 所有颜色别名都指向 globals.css 中定义的 CSS 变量（:root 浅色 / .dark 深色），
 * 从而用「令牌驱动主题」取代历史上 globals.css 里的 .dark !important 覆盖。
 * 语义名表达「设计意图」而非原始色值，便于跨主题一致复用：
 *   bg-app / bg-surface / bg-surface-inset / bg-surface-hover
 *   border-line / border-line-strong
 *   text-ink / text-muted / text-faint
 *   bg-accent / text-accent / bg-accent-soft / text-accent-soft / text-accent-fg
 *   bg-warm / text-warm / bg-warm-soft
 *   bg-success / text-success-fg · bg-danger / text-danger / text-danger-fg
 *
 * 半透明态（热力图三色、accent-soft 等）均以独立变量提供，不依赖 Tailwind
 * 的 /opacity 修饰符（var() 形式的颜色无法被解析拆分）。
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--app-bg)",
        surface: {
          DEFAULT: "var(--surface)",
          inset: "var(--surface-inset)",
          hover: "var(--surface-hover)",
        },
        line: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        ink: "var(--text)",
        muted: "var(--text-muted)",
        faint: "var(--text-faint)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          "soft-fg": "var(--accent-soft-fg)",
          fg: "var(--accent-fg)",
        },
        warm: {
          DEFAULT: "var(--warm)",
          strong: "var(--warm-strong)",
          soft: "var(--warm-soft)",
        },
        success: {
          DEFAULT: "var(--success)",
          fg: "var(--success-fg)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          hover: "var(--danger-hover)",
          fg: "var(--danger-fg)",
        },
      },
      fontFamily: {
        // 保留 CJK 回退（11 语种含中日韩），仅精简排序以优先取各平台最佳原生无衬线。
        sans: [
          "var(--font-display)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI Variable",
          "Segoe UI",
          "Helvetica Neue",
          "PingFang SC",
          "Hiragino Sans",
          "Microsoft YaHei",
          "Noto Sans CJK SC",
          "Noto Sans CJK JP",
          "Noto Sans CJK KR",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SF Mono",
          "Cascadia Code",
          "Segoe UI Mono",
          "Roboto Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "calc(var(--radius-lg) + 4px)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        // 科技 premium：主色/暖色染色外发光（交互高亮、关键卡片）
        glow: "var(--shadow-glow)",
        "glow-warm": "var(--shadow-glow-warm)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // 时间网格英雄进场：淡入 + 极轻微缩放（grid 作为核心视觉的锚点）。
        // 注意：shimmer / now-pulse 的 @keyframes 定义在 globals.css 中——它们被
        // 原始 CSS 按名引用、而非 animate-* 工具类；若放此处会被 Tailwind 按工具
        // 类使用情况 tree-shake，导致动画失效。
        "grid-in": {
          from: { opacity: "0", transform: "scale(0.99)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // —— 科技 premium 进场/悬停动效（exponential ease-out，无 bounce）——
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // 模糊进场：opacity + blur(8px)→0 + 上浮，用于顶栏/面板进场
        "blur-in": {
          from: { opacity: "0", transform: "translateY(8px)", filter: "blur(8px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // gradient-pan 的 @keyframes 同时存在于 globals.css（被原始 CSS 按名引用）；
        // 此处重复定义以供 animate-* 工具类使用——Tailwind 不会因重复声明而冲突，
        // 且确保工具类形式引用时不被 tree-shake。
        "gradient-pan": {
          from: { backgroundPosition: "0% 50%" },
          to: { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.42s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        // 注意：shimmer / now-pulse 的 @keyframes 定义在 globals.css 中
        // （它们被原始 CSS 按名引用，而非 animate-* 工具类；若在此定义会被
        //  Tailwind 按工具类使用情况 tree-shake 掉，导致动画失效）。
        "grid-in": "grid-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        // 科技 premium 进场（一次性，both 防止闪现终态前的初始态）
        "scale-in": "scale-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) both",
        "blur-in": "blur-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-left": "slide-in-left 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-down": "slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        // 渐变流动常驻动效（缓慢、克制；reduced-motion 下被全局归零）
        "gradient-pan": "gradient-pan 6s cubic-bezier(0.45, 0, 0.55, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
