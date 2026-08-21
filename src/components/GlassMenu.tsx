"use client";

import {
  createElement,
  forwardRef,
  useLayoutEffect,
  useState,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

/**
 * 下拉/弹出的 menu 层：CSS-only（.liquid-glass-menu），不挂折射。
 *
 * 必须 portal 到 body——顶栏带 backdrop-filter 后，子树内的菜单采到的是
 * 顶栏衬底而非页面，看起来像一块灰板。fixed 定位相对锚点，滚动/缩放时跟随。
 */
type GlassMenuProps = {
  anchorRef: { readonly current: HTMLElement | null };
  align?: "start" | "end";
  matchAnchorWidth?: boolean;
  width?: number;
  as?: "div" | "ul";
} & HTMLAttributes<HTMLElement>;

function measure(
  el: HTMLElement | null,
  align: "start" | "end",
  matchAnchorWidth: boolean,
  width: number | undefined,
): { top: number; left: number; width: number } | null {
  if (!el || typeof window === "undefined") return null;
  const r = el.getBoundingClientRect();
  const raw = matchAnchorWidth ? r.width : (width ?? r.width);
  const w = Math.min(raw, Math.max(16, window.innerWidth - 16));
  let left = align === "end" ? r.right - w : r.left;
  const maxLeft = window.innerWidth - w - 8;
  left = Math.min(Math.max(8, left), Math.max(8, maxLeft));
  return { top: r.bottom + 4, left, width: w };
}

const GlassMenu = forwardRef<HTMLElement, GlassMenuProps>(function GlassMenu(
  {
    anchorRef,
    align = "start",
    matchAnchorWidth = false,
    width,
    as = "div",
    className = "",
    children,
    style,
    ...rest
  },
  ref,
) {
  const [pos, setPos] = useState(() =>
    measure(anchorRef.current, align, matchAnchorWidth, width),
  );

  useLayoutEffect(() => {
    const update = () => {
      const next = measure(anchorRef.current, align, matchAnchorWidth, width);
      setPos((prev) => {
        if (
          prev &&
          next &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.width === next.width
        ) {
          return prev;
        }
        return next;
      });
    };
    update();
    window.addEventListener("resize", update);
    // 不 capture：菜单自身 overflow 滚动不应重算锚点（否则城市搜索列表每帧 setState）。
    window.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [anchorRef, align, matchAnchorWidth, width]);

  if (!pos || typeof document === "undefined") return null;

  return createPortal(
    createElement(
      as,
      {
        ...rest,
        ref,
        className: `liquid-glass-menu ${className}`,
        style: {
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: pos.width,
          zIndex: 50,
          ...style,
        },
      },
      children,
    ),
    document.body,
  );
});

GlassMenu.displayName = "GlassMenu";

export default GlassMenu;
