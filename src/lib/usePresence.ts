"use client";

import { useEffect, useRef, useState } from "react";

/**
 * usePresence —— 纯 CSS 退出动画的「穷人版 AnimatePresence」（零依赖）。
 *
 * 动机：本项目弹层一律用 `{open && <Comp/>}` 条件渲染，关闭即立即卸载，无法播放
 * 退出过渡。此 hook 在关闭时把元素多挂载 exitMs 毫秒，配合 globals.css 中的
 * `.motion-*` 类（由 `data-state` 驱动）完成进/出双向过渡。
 *
 * 用法：
 *   const { mounted, state } = usePresence(open, 200);
 *   return mounted ? (
 *     <div data-state={state} className="motion-pop …">…</div>
 *   ) : null;
 *
 * 设计要点：
 *   - **挂载与 open 同步**：mounted = open || leaving。open 翻 true 当帧即挂载，
 *     因此依赖 [open] 的焦点管理（如 HelpPopover 聚焦关闭按钮）仍能命中已存在的节点。
 *   - **进场过渡**：open→true 时先置 state="leave"（隐藏），双 rAF 后切 "enter"，
 *     触发 CSS 过渡（单 rAF 在某些浏览器会合并到同一帧，双 rAF 确保先绘制隐藏态）。
 *   - **退场过渡**：open→false 时置 leaving=true、state="leave"，exitMs 后 leaving=false
 *     真正卸载；期间过渡反向播放。仅从「曾打开」状态关闭时才延后卸载，初始即关闭的不挂载。
 *   - reduced-motion：globals.css 全局开关把过渡时长归零，leaving 几乎立即结束。
 *
 * @param open    期望可见性
 * @param exitMs  退出动画时长（毫秒），需与所配 .motion-* 类的 duration 大致匹配
 */
export function usePresence(open: boolean, exitMs: number) {
  const [leaving, setLeaving] = useState(false);
  const [state, setState] = useState<"enter" | "leave">("leave");
  const prevOpen = useRef(open);
  const mounted = open || leaving;

  useEffect(() => {
    if (open) {
      setLeaving(false);
      // 先隐藏态挂载，下一帧切显示态以触发过渡
      setState("leave");
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setState("enter"));
      });
      prevOpen.current = true;
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    // open=false：仅当此前处于打开态时才播放退出（避免初始即关闭的组件误挂载）
    if (prevOpen.current) {
      setState("leave");
      setLeaving(true);
      const id = window.setTimeout(() => setLeaving(false), exitMs);
      prevOpen.current = false;
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open, exitMs]);

  return { mounted, state };
}
