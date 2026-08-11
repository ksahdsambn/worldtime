/**
 * SEO 纯函数助手（第 11 轮：SEO 基建层）。
 *
 * 设计目标：把所有可在构建期确定的 SEO 派生数据（站点 URL、hreflang
 * alternates、OpenGraph 对象、JSON-LD、热门配对枚举）抽为纯函数，
 * 便于在 `tests/lib/seo.test.ts` 中脱离 Next 运行时单元测试；
 * 各路由的 `generateMetadata` / `sitemap.ts` / `robots.ts` 只做薄封装。
 */

import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * 站点根 URL。
 *
 * 生产环境必须通过 `NEXT_PUBLIC_SITE_URL` 环境变量提供真实域名，
 * 否则 metadataBase / canonical / sitemap 都会回退到占位域名。
 * 末尾斜杠会被统一裁掉，确保拼接出的 URL 形如 `https://x/zh`。
 */
export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const raw = env && env.length > 0 ? env : "https://worldtime.app";
  return raw.replace(/\/+$/, "");
}

/**
 * 构造某语言下的绝对 URL。
 * @param locale 语言代码（routing.locales 之一）
 * @param path   语言前缀之后的路径，以 `/` 开头或为空串（首页）
 */
export function localeUrl(locale: string, path = ""): string {
  const p = path.startsWith("/") ? path : path.length > 0 ? `/${path}` : "";
  return `${getSiteUrl()}/${locale}${p}`;
}

/**
 * OG 分享图尺寸与 alt（与 `[locale]/opengraph-image.tsx` 共用同一份常量，
 * 确保注入的 meta 与实际生成图一致）。
 */
export const OG_IMAGE = {
  width: 1200,
  height: 630,
  alt: "WorldTime — World Clock & Time Zone Converter",
};

/**
 * 某 locale 的 OG 图路由（相对路径，由 metadataBase 解析为绝对 URL）。
 * 注意：Next.js 中 `openGraph` 字段在子页面显式设置时会整体替换父段，
 * 不继承父段 file-based og 图；故需在每个自定义 openGraph 里显式引用。
 */
export function ogImageUrl(locale: string): string {
  return `/${locale}/opengraph-image`;
}

/**
 * 各 locale → OpenGraph `og:locale`（`language_REGION` 形式）。
 * 用于社交平台识别内容语言。
 */
export const LOCALE_OG_MAP: Record<string, string> = {
  zh: "zh_CN",
  "zh-Hant": "zh_TW",
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
  ja: "ja_JP",
  ko: "ko_KR",
  pt: "pt_PT",
  ru: "ru_RU",
  vi: "vi_VN",
};

/**
 * 为某语言/路径生成 canonical 与 hreflang alternates。
 *
 * - `canonical` 指向当前语言本页；
 * - `languages` 覆盖全部支持语言（含 `x-default` 指向默认语言），
 *   供搜索引擎做语言/区域收束，避免重复内容惩罚。
 *
 * @param locale 当前语言
 * @param path   语言前缀之后的路径（首页传空串）
 */
export function buildAlternates(
  locale: string,
  path = "",
): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = localeUrl(l, path);
  }
  languages["x-default"] = localeUrl(routing.defaultLocale, path);
  return {
    canonical: localeUrl(locale, path),
    languages,
  };
}

/**
 * 构造 OpenGraph 对象（type / locale / siteName / title / description / url / images）。
 *
 * `images` 显式引用 `/{locale}/opengraph-image` 路由：Next.js 中 `openGraph`
 * 在子页面显式设置时会整体替换父段，不继承 file-based og 图，故必须在此显式注入，
 * 否则覆盖了 openGraph 的页面（如时差对照页、事件页）会缺失 og:image。
 *
 * 返回类型交由推断（具体对象类型），使 `type` 为字面量 `"website"`，
 * 既便于测试直接读取字段，又可在各路由作为 `Metadata.openGraph` 赋值。
 */
export function buildOpenGraph(locale: string, opts: {
  title: string;
  description: string;
  path?: string;
  type?: "website";
}) {
  return {
    type: (opts.type ?? "website") as "website",
    locale: LOCALE_OG_MAP[locale] ?? locale,
    siteName: "WorldTime",
    title: opts.title,
    description: opts.description,
    url: localeUrl(locale, opts.path ?? ""),
    // 显式引用 OG 图：子页面覆盖 openGraph 时不会继承 file-based og 图
    images: [{ url: ogImageUrl(locale), ...OG_IMAGE }],
  };
}

/**
 * 热门城市对（构建期预生成 + sitemap 内链）。
 * 与 `time-converter/[slug]/page.tsx` 共用同一数据源，避免重复维护。
 */
export const POPULAR_CITY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["cn-beijing", "us-new-york"],
  ["gb-london", "jp-tokyo"],
  ["us-new-york", "gb-london"],
  ["cn-shanghai", "au-sydney"],
  ["us-los-angeles", "de-berlin"],
];

/**
 * 热门时区缩写对（构建期预生成 + sitemap 内链）。
 */
export const POPULAR_TZ_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["EST", "PST"],
  ["GMT", "CET"],
  ["JST", "PST"],
  ["IST", "EST"],
];

/**
 * 枚举全部热门配对的 slug（以 `--` 双连号分隔）。
 * 供 sitemap 与首页内链区复用。
 */
export function buildLandingSlugs(): string[] {
  const slugs: string[] = [];
  for (const [a, b] of POPULAR_CITY_PAIRS) slugs.push(`${a}--${b}`);
  for (const [a, b] of POPULAR_TZ_PAIRS) slugs.push(`${a}--${b}`);
  return slugs;
}

/**
 * WebApplication JSON-LD 结构化数据（供富结果识别应用类型）。
 */
export function webAppJsonLd(opts: {
  name: string;
  url: string;
  description: string;
  applicationCategory?: string;
}): {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  description: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: { "@type": string; price: string; priceCurrency: string };
} {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.name,
    url: opts.url,
    description: opts.description,
    applicationCategory: opts.applicationCategory ?? "UtilitiesApplication",
    operatingSystem: "Any (Web Browser)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}
