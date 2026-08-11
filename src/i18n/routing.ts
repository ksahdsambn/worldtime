import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // 中文为默认语言，英文为备选，其余为全球主流语言
  locales: ["zh", "zh-Hant", "en", "es", "fr", "de", "ja", "ko", "pt", "ru", "vi"],
  defaultLocale: "zh",
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
