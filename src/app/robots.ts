import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

/**
 * `/robots.txt`。
 *
 * - 放行首页与时差对照页（核心可索引内容）；
 * - 禁止 `/widget/`（嵌入小组件，会与主站争抢排名/关键词蚕食）；
 * - 禁止 `/event/`（事件页 URL 为 base64 状态，无稳定 canonical、
 *   抓取面无限，作为分享页保留但不纳入索引）；
 * - 声明 sitemap 位置。
 *
 * 路径适配（审查报告 P3）：next-intl 使全部 URL 带 locale 前缀（如 /zh/widget/...），
 * 若仅写裸路径 `/widget/`，robots.txt 前缀匹配将不命中任何实际 URL，规则形同虚设。
 * 故按路由表枚举全部 `/{locale}/widget/` 与 `/{locale}/event/` 前缀。
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const hiddenPaths = routing.locales.flatMap((locale) => [
    `/${locale}/widget/`,
    `/${locale}/event/`,
  ]);
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: hiddenPaths,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
