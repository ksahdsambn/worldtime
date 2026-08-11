import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/**
 * `/robots.txt`。
 *
 * - 放行首页与时差对照页（核心可索引内容）；
 * - 禁止 `/widget/`（嵌入小组件，会与主站争抢排名/关键词蚕食）；
 * - 禁止 `/event/`（事件页 URL 为 base64 状态，无稳定 canonical、
 *   抓取面无限，作为分享页保留但不纳入索引）；
 * - 声明 sitemap 位置。
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/widget/", "/event/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
