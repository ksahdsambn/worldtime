/**
 * 氛围背景（科技 premium 极光层）。
 *
 * 固定全屏、置于内容之下（z-index:-10）、不拦截指针。纯 CSS 驱动（令牌 +
 * keyframes），无 JS 状态、SSR 安全；两套主题由 --aurora-* / --grid-texture
 * 令牌自动切换。缓慢漂移在 prefers-reduced-motion 下被 globals.css 全局守卫
 * 归零为静态快照。打印态由 .no-print 隐藏。
 *
 * 可见性前提：顶层页面容器不可覆盖 opaque 背景（body 已铺 --app-bg 作基底）。
 */
export default function AtmosphereBackground() {
  return (
    <div className="atmosphere no-print" aria-hidden="true">
      <div className="atmosphere__aurora" />
      <div className="atmosphere__topglow" />
      <div className="atmosphere__grid" />
    </div>
  );
}
