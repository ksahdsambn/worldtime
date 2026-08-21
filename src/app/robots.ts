import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/**
 * `/robots.txt`。
 *
 * - 全站放行（含 GPTBot 等 AI 爬虫显式 Allow，与 `*` 等价、作 GEO 声明）；
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
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "ClaudeBot",
          "Anthropic-AI",
          "PerplexityBot",
          "Applebot-Extended",
          "CCBot",
          "meta-externalagent",
        ],
        allow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
