"use client";

import { useEffect } from "react";

/**
 * 注入 Google Identity Services (GIS) 客户端脚本。
 *
 * 镜像 `ServiceWorkerRegister` 的模式：客户端 `useEffect` 命令式注入，返回 null。
 * 脚本加载完成后 `window.google.accounts.oauth2` 可用，由 `GoogleCalendarConnect`
 * 调用 `initTokenClient` / `revoke`。用 `data-gis` 属性去重，避免重复挂载注入多份。
 * GisScript 只负责"让脚本出现在页面上"，不关心 token 状态。
 */
const GIS_SRC = "https://accounts.google.com/gsi/client";

export default function GisScript() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.querySelector('script[data-gis="1"]')) return;
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-gis", "1");
    document.head.appendChild(s);
  }, []);
  return null;
}
