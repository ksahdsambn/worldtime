import type { CityRecord } from "@/lib/types";
import { isChineseLocale, type AppLocale } from "@/i18n/routing";

/**
 * 按页面 locale 选取城市的显示名（国际化扩展）。
 *
 * 城市数据目前只内置中文（nameZh）与英文（nameEn）两套名称。
 * 中文页面（简体 zh、繁体 zh-Hant）显示中文名；其余语言统一回退到英文名
 * ——对绝大多数非中文 locale 而言，英文名（多为罗马音/通行拉丁名）比中文名
 * 更易读，也是国际化城市名的通行做法。日文/韩文等场景后续如需本地化城市名，
 * 可在此扩展查表逻辑，无需改动调用方。
 *
 * @param locale 当前页面语言
 * @param city   城市记录（CityRecord 或 PlaceItem）
 */
export function localCityName(locale: AppLocale, city: Pick<CityRecord, "nameZh" | "nameEn">): string {
  return isChineseLocale(locale) ? city.nameZh : city.nameEn;
}
