"use client";

import { useEffect, useState } from "react";

/**
 * 提供实时刷新的"当前时刻"（epoch 毫秒）。默认 30s（WC-5）；调用方可传入间隔。
 *
 * SSR 安全：初始返回 null（服务端与首屏客户端均无时间，避免水合不一致），
 * 挂载后切换为客户端真实时刻并按间隔刷新。后台标签页暂停轮询，回前台立刻对齐。
 */
export function useNow(intervalMs: number = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };
    const start = () => {
      if (id !== null) return;
      setNow(Date.now());
      id = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [intervalMs]);

  return now;
}
