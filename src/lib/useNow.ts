"use client";

import { useEffect, useState } from "react";

/**
 * 提供实时刷新的"当前时刻"（epoch 毫秒），每分钟更新一次（WC-5 实时刷新）。
 *
 * SSR 安全：初始返回 null（服务端与首屏客户端均无时间，避免水合不一致），
 * 挂载后切换为客户端真实时刻并按间隔刷新。
 */
export function useNow(intervalMs: number = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
