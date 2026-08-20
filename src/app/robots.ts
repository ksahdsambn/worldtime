import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/**
 * `/robots.txt`。
 *
 * - 放行首页与时差对照页（核心可索引内容）；
 * - 声明 sitemap 位置。
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
