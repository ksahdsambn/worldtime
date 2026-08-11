"use client";

import { useEffect } from "react";

/**
 * 注册 Service Worker（第八章 离线可用）。
 *
 * 关键行为：
 * - 仅在生产环境注册（开发环境 sw 与 HMR 冲突，且 /sw.js 不经 Next 编译）。
 * - 监听新版本安装：当新的 sw 接管（controllerchange）时，刷新一次页面，
 *   确保部署更新后旧缓存（如 worldtime-v1）被清理、新外壳（v2）立即生效。
 *   仅在本次会话中首次接管时刷新，避免循环刷新。
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 注册失败忽略（如非 HTTPS 环境）
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
