import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { CITIES } from "@/data/cities";
import {
  buildLandingSlugs,
  hreflangLanguages,
  localeUrl,
  sitemapLastModDate,
} from "@/lib/seo";
import { countryCodesInIndex } from "@/lib/cityFacts";

function localizedEntries(
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap {
  const languages = hreflangLanguages(path);
  return routing.locales.map((locale) => ({
    url: localeUrl(locale, path),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = sitemapLastModDate();
  const entries: MetadataRoute.Sitemap = [];

  entries.push(...localizedEntries("", lastModified, "weekly", 1.0));
  entries.push(...localizedEntries("/about", lastModified, "monthly", 0.4));
  entries.push(...localizedEntries("/privacy", lastModified, "yearly", 0.2));

  for (const slug of buildLandingSlugs()) {
    entries.push(
      ...localizedEntries(`/time-converter/${slug}`, lastModified, "weekly", 0.7),
    );
  }

  for (const city of CITIES) {
    entries.push(...localizedEntries(`/time/${city.id}`, lastModified, "hourly", 0.8));
  }

  for (const code of countryCodesInIndex()) {
    entries.push(
      ...localizedEntries(`/country/${code.toLowerCase()}`, lastModified, "weekly", 0.5),
    );
  }

  return entries;
}
