/**
 * SEO 纯函数助手。
 *
 * 把可在构建期确定的 SEO 派生数据抽为纯函数，便于脱离 Next 运行时单测；
 * 各路由的 generateMetadata / sitemap.ts / robots.ts 只做薄封装。
 */

import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { parseSlug } from "@/lib/landingSlug";

/**
 * 站点真实域名以 NEXT_PUBLIC_SITE_URL 为准（.env.example 同源维护）；
 * 此回退值须与 .env.example 保持一致，避免构建产物出现第二个域名。
 */
export const SITE_URL_FALLBACK = "https://time.eqde.de";

export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const raw = env && env.length > 0 ? env : SITE_URL_FALLBACK;
  return raw.replace(/\/+$/, "");
}

export function localeUrl(locale: string, path = ""): string {
  const p = path.startsWith("/") ? path : path.length > 0 ? `/${path}` : "";
  return `${getSiteUrl()}/${locale}${p}`;
}

export const OG_IMAGE = {
  width: 1200,
  height: 630,
  alt: "WorldTime — World Clock & Time Zone Converter",
};

/** 静态 OG（带扩展名）。Slack / LinkedIn / iMessage 对无后缀动态路由不稳定。 */
export const OG_IMAGE_PATH = "/og.png";
export const OG_SQUARE_PATH = "/og-square.png";
export const BRAND_MARK_PNG = "/brand/worldtime-mark.png";
export const APPLE_TOUCH_ICON = "/apple-touch-icon.png";

export const SEO_KEYWORDS = [
  "world clock",
  "time zone converter",
  "meeting planner",
  "timezone converter",
  "world time",
  "international meeting scheduler",
  "daylight saving time",
  "DST",
  "IANA time zone",
];

export function ogImageUrl(_locale?: string): string {
  return OG_IMAGE_PATH;
}

/** 社交 og:locale。葡语面向更大的 pt-BR 市场。 */
export const LOCALE_OG_MAP: Record<string, string> = {
  zh: "zh_CN",
  "zh-Hant": "zh_TW",
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
  ja: "ja_JP",
  ko: "ko_KR",
  pt: "pt_BR",
  ru: "ru_RU",
  vi: "vi_VN",
};

/**
 * 应用 locale → hreflang（BCP 47）。
 * `zh` 输出 zh-Hans；葡语输出 pt-BR。URL 路径仍用应用 locale。
 */
export const HREFLANG_MAP: Record<string, string> = {
  zh: "zh-Hans",
  "zh-Hant": "zh-Hant",
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  ja: "ja",
  ko: "ko",
  pt: "pt-BR",
  ru: "ru",
  vi: "vi",
};

/** 搜索引擎 x-default：全球工具站指向英文。UX 默认语言仍由 routing.defaultLocale 决定。 */
export const SEO_DEFAULT_LOCALE = "en";

/** sitemap lastmod：内容指纹日。勿用 Date.now()，否则每次构建全站“刚更新”。 */
export const SITEMAP_LASTMOD = "2026-08-22";

export function sitemapLastModDate(): Date {
  return new Date(`${SITEMAP_LASTMOD}T00:00:00.000Z`);
}

export function hreflangLanguages(path = ""): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[HREFLANG_MAP[l] ?? l] = localeUrl(l, path);
  }
  languages["x-default"] = localeUrl(SEO_DEFAULT_LOCALE, path);
  return languages;
}

export function buildAlternates(
  locale: string,
  path = "",
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localeUrl(locale, path),
    languages: hreflangLanguages(path),
    // llms.txt 机器可读链接须随每个子页携带：Next 的 metadata 合并按顶层键
    // 整体覆盖，子页声明 alternates 后 layout 的 types 即丢失。
    types: {
      "text/plain": `${getSiteUrl()}/llms.txt`,
    },
  };
}

export function buildOpenGraph(locale: string, opts: {
  title: string;
  description: string;
  path?: string;
  type?: "website";
}) {
  const alternateLocale = routing.locales
    .filter((l) => l !== locale)
    .map((l) => LOCALE_OG_MAP[l] ?? l);
  return {
    type: (opts.type ?? "website") as "website",
    locale: LOCALE_OG_MAP[locale] ?? locale,
    alternateLocale,
    siteName: "WorldTime",
    title: opts.title,
    description: opts.description,
    url: localeUrl(locale, opts.path ?? ""),
    images: [
      {
        url: ogImageUrl(locale),
        ...OG_IMAGE,
        type: "image/png",
      },
    ],
  };
}

export function buildTwitterCard(): {
  card: "summary_large_image";
  images: string[];
} {
  return { card: "summary_large_image", images: [OG_IMAGE_PATH] };
}

export const POPULAR_CITY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["cn-beijing", "us-new-york"],
  ["cn-beijing", "gb-london"],
  ["cn-beijing", "jp-tokyo"],
  ["cn-beijing", "us-los-angeles"],
  ["cn-beijing", "au-sydney"],
  ["cn-beijing", "sg-singapore"],
  ["cn-beijing", "de-berlin"],
  ["gb-london", "us-new-york"],
  ["us-new-york", "us-los-angeles"],
  ["gb-london", "jp-tokyo"],
  ["us-los-angeles", "de-berlin"],
  ["cn-shanghai", "au-sydney"],
  ["in-mumbai", "us-new-york"],
  ["ae-dubai", "gb-london"],
  ["sg-singapore", "gb-london"],
  ["kr-seoul", "us-new-york"],
  ["fr-paris", "us-new-york"],
  ["hk-hong-kong", "gb-london"],
  ["us-chicago", "de-frankfurt"],
  ["au-sydney", "gb-london"],
  ["us-new-york", "jp-tokyo"],
  ["us-new-york", "au-sydney"],
  ["us-new-york", "br-sao-paulo"],
  ["gb-london", "in-mumbai"],
  ["jp-tokyo", "au-sydney"],
  ["jp-tokyo", "sg-singapore"],
  ["ru-moscow", "gb-london"],
  ["ca-toronto", "gb-london"],
  ["mx-mexico-city", "us-new-york"],
  ["za-johannesburg", "gb-london"],
  ["es-madrid", "us-new-york"],
  ["it-rome", "us-new-york"],
  ["nl-amsterdam", "us-new-york"],
  ["br-sao-paulo", "gb-london"],
  ["de-berlin", "gb-london"],
];

export const POPULAR_TZ_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["EST", "PST"],
  ["GMT", "CET"],
  ["JST", "PST"],
  ["IST", "EST"],
  ["CET", "JST"],
  ["GMT", "EST"],
  ["PST", "GMT"],
  ["AEST", "PST"],
  ["CST_CN", "EST"],
  ["KST", "GMT"],
  ["NZST", "GMT"],
];

export function buildLandingSlugs(): string[] {
  const slugs: string[] = [];
  for (const [a, b] of POPULAR_CITY_PAIRS) slugs.push(`${a}--${b}`);
  for (const [a, b] of POPULAR_TZ_PAIRS) slugs.push(`${a}--${b}`);
  return slugs;
}

export function popularCityIds(): string[] {
  const ids = new Set<string>();
  for (const [a, b] of POPULAR_CITY_PAIRS) {
    ids.add(a);
    ids.add(b);
  }
  return [...ids];
}

export function reverseLandingSlug(slug: string): string | null {
  const i = slug.indexOf("--");
  if (i <= 0) return null;
  const a = slug.slice(0, i);
  const b = slug.slice(i + 2);
  if (!a || !b) return null;
  return `${b}--${a}`;
}

/**
 * 对照页 canonical slug：热门表优先（含反向命中热门），否则按字典序收束 A--B / B--A。
 *
 * 经 parseSlug 归一后再比较：城市 id 统一小写、时区缩写统一大写，
 * 避免大小写变体（如 CN-BEIJING--US-NEW-YORK）各自声明不同的 canonical，
 * 造成同内容多 canonical 的碎片化。
 */
export function canonicalLandingSlug(slug: string): string {
  const info = parseSlug(slug);
  if (!info) return slug; // 不可解析：页面本身 notFound，保持原样即可
  const popular = new Set(buildLandingSlugs());
  const forward = `${info.aId}--${info.bId}`;
  const reverse = `${info.bId}--${info.aId}`;
  if (popular.has(forward)) return forward;
  if (popular.has(reverse)) return reverse;
  return info.aId.toLowerCase() <= info.bId.toLowerCase() ? forward : reverse;
}

export function stringifyJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function interp(tpl: string, vars: Record<string, string>): string {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, v);
  }
  return out;
}

const DEFAULT_FEATURE_LIST = [
  "World clock",
  "Time zone converter",
  "Cross-timezone meeting planner",
  "DST-aware offsets",
  "11 languages",
];

export function webAppJsonLd(opts: {
  name: string;
  url: string;
  description: string;
  applicationCategory?: string;
  image?: string;
  screenshot?: string;
  featureList?: string[];
}): {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  description: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: { "@type": string; price: string; priceCurrency: string };
  image: string;
  screenshot: string;
  featureList: string[];
  inLanguage: string[];
  isAccessibleForFree: boolean;
  browserRequirements: string;
  applicationSubCategory: string;
} {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.name,
    url: opts.url,
    description: opts.description,
    applicationCategory: opts.applicationCategory ?? "UtilitiesApplication",
    applicationSubCategory: "Time Zone Converter",
    operatingSystem: "Any (Web Browser)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    image: opts.image ?? `${site}${BRAND_MARK_PNG}`,
    screenshot: opts.screenshot ?? `${site}${OG_IMAGE_PATH}`,
    featureList: opts.featureList ?? DEFAULT_FEATURE_LIST,
    inLanguage: routing.locales.map((l) => HREFLANG_MAP[l] ?? l),
    isAccessibleForFree: true,
    browserRequirements: "Requires JavaScript. Works in any modern web browser.",
  };
}

export function faqPageJsonLd(
  items: ReadonlyArray<{ question: string; answer: string }>,
): {
  "@context": string;
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
} {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

export function organizationJsonLd(opts: {
  url: string;
  name?: string;
  logoUrl?: string;
  description?: string;
  aboutUrl?: string;
}): {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  logo: string;
  description?: string;
  knowsAbout?: string[];
  publishingPrinciples?: string;
} {
  const ld: {
    "@context": string;
    "@type": string;
    name: string;
    url: string;
    logo: string;
    description?: string;
    knowsAbout?: string[];
    publishingPrinciples?: string;
  } = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: opts.name ?? "WorldTime",
    url: opts.url,
    logo: opts.logoUrl ?? `${getSiteUrl()}${BRAND_MARK_PNG}`,
  };
  if (opts.description) ld.description = opts.description;
  ld.knowsAbout = [
    "time zones",
    "world clock",
    "daylight saving time",
    "IANA Time Zone Database",
    "meeting scheduling",
  ];
  if (opts.aboutUrl) ld.publishingPrinciples = opts.aboutUrl;
  return ld;
}

export function websiteJsonLd(opts?: {
  name?: string;
  description?: string;
}): {
  "@context": string;
  "@type": "WebSite";
  name: string;
  url: string;
  description?: string;
  inLanguage: string[];
  publisher: { "@type": "Organization"; name: string; url: string };
} {
  const url = getSiteUrl();
  const ld: {
    "@context": string;
    "@type": "WebSite";
    name: string;
    url: string;
    description?: string;
    inLanguage: string[];
    publisher: { "@type": "Organization"; name: string; url: string };
  } = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: opts?.name ?? "WorldTime",
    url,
    inLanguage: routing.locales.map((l) => HREFLANG_MAP[l] ?? l),
    publisher: { "@type": "Organization", name: "WorldTime", url },
  };
  if (opts?.description) ld.description = opts.description;
  return ld;
}

export function webPageJsonLd(opts: {
  name: string;
  url: string;
  description: string;
  inLanguage: string;
  dateModified?: string;
}): {
  "@context": string;
  "@type": "WebPage";
  name: string;
  url: string;
  description: string;
  inLanguage: string;
  isPartOf: { "@type": "WebSite"; name: string; url: string };
  dateModified?: string;
} {
  const ld: {
    "@context": string;
    "@type": "WebPage";
    name: string;
    url: string;
    description: string;
    inLanguage: string;
    isPartOf: { "@type": "WebSite"; name: string; url: string };
    dateModified?: string;
  } = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    url: opts.url,
    description: opts.description,
    inLanguage: opts.inLanguage,
    isPartOf: { "@type": "WebSite", name: "WorldTime", url: getSiteUrl() },
  };
  if (opts.dateModified) ld.dateModified = opts.dateModified;
  return ld;
}

export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; url: string }>,
): {
  "@context": string;
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
} {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function placeJsonLd(opts: {
  name: string;
  countryName: string;
  timeZone: string;
}): {
  "@context": string;
  "@type": "Place";
  name: string;
  containedInPlace: { "@type": "Country"; name: string };
  additionalProperty: Array<{ "@type": "PropertyValue"; name: string; value: string }>;
} {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: opts.name,
    containedInPlace: { "@type": "Country", name: opts.countryName },
    additionalProperty: [
      { "@type": "PropertyValue", name: "ianaTimeZone", value: opts.timeZone },
    ],
  };
}
