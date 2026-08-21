import { type ReactNode } from "react";

/**
 * 统一的状态 / 空状态表面（科技 premium）。
 *
 * 居中不透明 HUD 卡 + 动效图标（scale-in）+ 渐变标题，用于 loading / error /
 * not-found / 事件失效态等，统一这些「边缘界面」的视觉语言。纯展示（动效由
 * CSS 提供），无 hook，可被 server 或 client 组件直接渲染。
 *
 * - icon：通常是 emoji 或小型 SVG；以 scale-in 进场。
 * - title：页面主标题（渲染为 h1）。
 * - description：副文案。
 * - children：操作区（按钮等）。
 */
type StateSurfaceProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** 附加到 <main> 的类（如 min-h 调整）。 */
  className?: string;
};

export function StateSurface({
  icon,
  title,
  description,
  children,
  className = "",
}: StateSurfaceProps) {
  return (
    <main
      className={`flex min-h-[60vh] flex-col items-center justify-center gap-5 p-8 text-center ${className}`}
    >
      {icon != null && (
        <div className="brand-orbit animate-scale-in text-5xl" aria-hidden>
          {icon}
        </div>
      )}
      <div className="hud-frame max-w-md space-y-2.5 px-7 py-8">
        <h1 className="text-lg font-bold text-gradient">{title}</h1>
        {description != null && (
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        )}
        {children != null && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {children}
          </div>
        )}
      </div>
    </main>
  );
}
