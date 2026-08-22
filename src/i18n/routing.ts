import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // UX 无 Accept-Language 时回退中文；搜索 x-default / SEO_DEFAULT_LOCALE 为英文。
  locales: ["zh", "zh-Hant", "en", "es", "fr", "de", "ja", "ko", "pt", "ru", "vi"],
  defaultLocale: "zh",
  // 关闭中间件自动注入的 Link 头 hreflang：它输出原始 locale 码（zh/pt）与
  // 未加前缀的 x-default，且 host 取请求方（localhost/代理），与页面 head 中经
  // HREFLANG_MAP 映射（zh-Hans/pt-BR、x-default→/en）且绝对化的 hreflang 矛盾。
  // head 内版本为唯一事实来源。
  alternateLinks: false,
});

export type AppLocale = (typeof routing.locales)[number];

/**
 * 各语言在语言切换器中显示的原生名称（autonym）。
 * 集中维护，避免在每个 messages 文件里重复声明一遍各语言名。
 */
export const LOCALE_NAMES: Record<AppLocale, string> = {
  zh: "中文",
  "zh-Hant": "繁體中文",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  ko: "한국어",
  pt: "Português",
  ru: "Русский",
  vi: "Tiếng Việt",
};

/**
 * 判断某 locale 是否为中文变体（简体 zh、繁体 zh-Hant、以及未来可能的 zh-TW/HK 等）。
 * 用于城市名回退（显示中文名而非英文名）与时长分隔符（数字与单位间无空格）等场景。
 */
export function isChineseLocale(locale: string): boolean {
  return locale.startsWith("zh");
}
