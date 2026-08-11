import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSiteUrl, buildLandingSlugs } from "@/lib/seo";

/**
 * 站点地图（`/sitemap.xml`）。
 *
 * 涵盖：
 * - 首页 × 11 语言（含 hreflang alternates）；
 * - 热门时差对照页（城市对 + 时区缩写对）× 11 语言。
 *
 * 路由本身在 `src/app/` 根（非 `[locale]` 段），路径含扩展名 `.xml`，
 * 会被 `middleware.ts` 的 matcher 排除，直接由 Next 提供服务。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  // 首页：每语言一条，附全语言 alternates。
  const homeLanguages: Record<string, string> = {};
  for (const l of routing.locales) homeLanguages[l] = `${base}/${l}`;
  homeLanguages["x-default"] = `${base}/${routing.defaultLocale}`;
  for (const locale of routing.locales) {
    entries.push({
      url: `${base}/${locale}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: { languages: homeLanguages },
    });
  }

  // 时差对照页：每语言 × 热门配对，附同 slug 的全语言 alternates（权重收束）。
  for (const slug of buildLandingSlugs()) {
    const languages: Record<string, string> = {};
    for (const l of routing.locales) {
      languages[l] = `${base}/${l}/time-converter/${slug}`;
    }
    languages["x-default"] = `${base}/${routing.defaultLocale}/time-converter/${slug}`;
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}/time-converter/${slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: { languages },
      });
    }
  }

  return entries;
}
