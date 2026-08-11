import type { MetadataRoute } from "next";

/**
 * Web 应用清单（`/manifest.webmanifest`）。
 *
 * 项目已注册 Service Worker（PWA 离线），此前缺少清单导致安装/可发现性缺失。
 * 主题色与 brand 一致（blue-600）；图标暂复用 favicon，后续可补 PNG 多尺寸。
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
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
