import type { MetadataRoute } from "next";

/**
 * Web 应用清单（`/manifest.webmanifest`）。
 *
 * 项目已注册 Service Worker（PWA 离线），此前缺少清单导致安装/可发现性缺失。
 * 主题色与 brand 一致（blue-600）。
 *
 * 图标（第 14 轮）：PNG 位图 192/512（any）+ maskable 变体（全出血底，适配
 * Android 自适应图标 / Windows 平铺裁切），由 scripts/gen-icons.mjs 从
 * src/app/icon.svg 栅格化生成；同时保留 SVG 作为矢量兜底。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WorldTime — World Clock & Time Zone Converter",
    short_name: "WorldTime",
    description:
      "World clock, time zone converter, and meeting scheduler across cities and time zones.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
