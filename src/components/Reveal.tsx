"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

/**
 * 滚动进场（Reveal）—— 元素进入视口时触发一次性进场动画。
 *
 * 设计要点：
 * - **SSR 安全 & 无 JS 可降级**：初始渲染不隐藏内容（enabled=false 即可见），
 *   仅在挂载并经 IntersectionObserver 判定「未进入视口」后才隐藏。这样 SSR、
 *   首屏可见内容、以及禁用 JS 的用户都不会看到「空白」。
 * - **reduced-motion**：直接标记为已显示，动画由全局守卫归零为瞬时。
 * - 仅用于「视口下方」内容（footer / 落地页章节）；首屏英雄请用 mount-once 的
 *   `animate-*` 工具类，避免与 IO 抢节奏。
 *
 * 用法：
 *   <Reveal className="..."><section>…</section></Reveal>
 *   <Reveal as="li" delay={80}>…</Reveal>
 */
type RevealProps = {
  children: ReactNode;
  /** 渲染的标签，默认 div。 */
  as?: ElementType;
  className?: string;
  /** 未进入视口时附加（默认 opacity-0）。仅 enabled 后生效。 */
  hiddenClassName?: string;
  /** 进入视口后附加（默认 animate-fade-up）。 */
  shownClassName?: string;
  /** 进场延迟（ms），映射到 animation-delay，用于错落。 */
  delay?: number;
  /** IntersectionObserver threshold，默认 0.12。 */
  threshold?: number;
  /** IntersectionObserver rootMargin，默认底部 -8% 提前触发。 */
  rootMargin?: string;
  /** 是否仅触发一次（默认 true）；false 则反复进出会重播。 */
  once?: boolean;
};

export function Reveal({
  children,
  as,
  className = "",
  hiddenClassName,
  shownClassName,
  delay,
  threshold = 0.12,
  rootMargin = "0px 0px -8% 0px",
  once = true,
}: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  // enabled：客户端挂载且决定启用隐藏逻辑（SSR/首屏为 false，内容可见）
  const [enabled, setEnabled] = useState(false);
  const [shown, setShown] = useState(false);
  // noMotion：用户偏好减少动效 → 直接可见，且不挂任何 animate-* 类（避免其
  // `both` fill 的 opacity:0 起态在 animation-delay 期间造成短暂闪隐）。
  const [noMotion, setNoMotion] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      setNoMotion(reduce);
      setShown(true);
      return;
    }
    setEnabled(true);
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once]);

  const hidden = enabled && !shown;
  const stateClass = noMotion
    ? ""
    : hidden
      ? (hiddenClassName ?? "opacity-0")
      : shown
        ? (shownClassName ?? "animate-fade-up")
        : "";

  return (
    <Tag
      ref={ref}
      className={`${className} ${stateClass}`.trim()}
      style={delay && !noMotion ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
