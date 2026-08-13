"use client";

import { useCallback } from "react";

/**
 * 原生 View Transitions API 的 feature-detect 包装（科技 premium 主题切换过渡）。
 *
 * 用于在主题切换等状态变更外包裹一层「圆形扩散擦除」过渡：调用方在回调里设置
 * 触发坐标（--vt-x / --vt-y），由 globals.css 的 ::view-transition-new(root)
 * clip-path 动画完成圆形揭示。不支持或 reduced-motion 时，直接同步执行回调、
 * 退化为平滑过渡，绝不阻塞功能。
 *
 * 参考：https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 */

/** 是否支持原生 View Transitions API（client 端判定）。 */
export function supportsViewTransition(): boolean {
  return (
    typeof document !== "undefined" &&
    // startViewTransition 为较新 API，需运行时探测
    typeof (document as Document & { startViewTransition?: unknown }).startViewTransition ===
      "function"
  );
}

/** 是否需要尊重用户的减少动效偏好。 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 返回一个包装器 `run`：在 View Transition 内执行传入回调。
 * - 支持且未开 reduced-motion：document.startViewTransition(fn)，返回 transition.finished；
 * - 否则：同步执行 fn，返回已 resolve 的 Promise。
 *
 * 用法：
 *   const run = useViewTransition();
 *   run(() => setTheme(next));
 */
export function useViewTransition() {
  return useCallback(
    <T,>(fn: () => T | Promise<T>): Promise<void> => {
      // 直接执行路径：不支持 / reduced-motion
      if (!supportsViewTransition() || prefersReducedMotion()) {
        try {
          void fn();
        } catch {
          /* 忽略：调用方自行处理其状态 */
        }
        return Promise.resolve();
      }
      const doc = document as Document & {
        startViewTransition?: (cb: () => Promise<void> | void) => {
          finished: Promise<void>;
        };
      };
      try {
        // 注意：fn 应在其内部用 flushSync 同步提交 DOM（见 ThemeToggle），
        // 否则 React 异步渲染会使过渡捕获到旧==新快照，过渡不可见。
        // 即便如此，fn 仍会执行，功能不丢失。
        const transition = doc.startViewTransition!(async () => {
          await fn();
        });
        return transition.finished.catch(() => {
          /* transition 被打断时静默 */
        });
      } catch {
        // startViewTransition 同步抛出（某些嵌入 WebView）：回退到直接执行，
        // 保证状态变更一定发生，绝不阻塞功能。
        try {
          void fn();
        } catch {
          /* 忽略 */
        }
        return Promise.resolve();
      }
    },
    [],
  );
}
