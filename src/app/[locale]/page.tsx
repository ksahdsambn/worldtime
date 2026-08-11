import { setRequestLocale, getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import CitySearch from "@/components/CitySearch";
import PlacesPanel from "@/components/PlacesPanel";
import TimeGrid from "@/components/TimeGrid";
import SelectionBar from "@/components/SelectionBar";
import SettingsPanel from "@/components/SettingsPanel";
import ThemeToggle from "@/components/ThemeToggle";
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect";
import PrintExport from "@/components/PrintExport";
import HeatmapLegend from "@/components/HeatmapLegend";
import NowButton from "@/components/NowButton";
import CursorBar from "@/components/CursorBar";
import DateJump from "@/components/DateJump";
import UrlStateSync from "@/components/UrlStateSync";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { JsonLd } from "@/components/JsonLd";
import { Link } from "@/i18n/navigation";
import { CITY_BY_ID } from "@/data/cities";
import {
  POPULAR_CITY_PAIRS,
  POPULAR_TZ_PAIRS,
  webAppJsonLd,
  localeUrl,
} from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * 热门时差对照内链项：供首页底部 SEO 文案区使用。
 * 城市对显示城市英文名；时区缩写对显示缩写。
 */
function popularConverterLinks() {
  const city = POPULAR_CITY_PAIRS.map(([a, b]) => {
    const ca = CITY_BY_ID[a];
    const cb = CITY_BY_ID[b];
    return {
      slug: `${a}--${b}`,
      label: ca && cb ? `${ca.nameEn} ↔ ${cb.nameEn}` : `${a} ↔ ${b}`,
    };
  });
  const tz = POPULAR_TZ_PAIRS.map(([a, b]) => ({
    slug: `${a}--${b}`,
    label: `${a} ↔ ${b}`,
  }));
  return [...city, ...tz];
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  // 启用静态渲染
  setRequestLocale(locale);
  // async server component 中不能用 hook，用 getTranslations 替代 useTranslations
  const t = await getTranslations({ locale, namespace: "App" });
  const tSeo = await getTranslations({ locale, namespace: "Seo" });

  return (
    <div className="flex min-h-screen flex-col">
      <UrlStateSync />
      <KeyboardShortcuts />
      {/* 顶部导航栏：品牌、城市搜索、语言切换、设置（设置入口后续步骤补全） */}
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2 bg-white">
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <span className="hidden sm:inline text-xs text-gray-500">{t("tagline")}</span>
        <div className="ml-auto flex items-center gap-3">
          <CitySearch />
          <LocaleSwitcher />
          <SettingsPanel />
          <ThemeToggle />
          <GoogleCalendarConnect />
        </div>
      </header>

      {/* 主体：左侧地点列表 + 右侧网格区域（网格在步骤 2.5 引入） */}
      <div className="flex flex-1 flex-col md:flex-row">
        <PlacesPanel />
        <main className="flex-1 overflow-hidden p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <HeatmapLegend />
            <div className="flex flex-wrap items-center gap-2">
              <DateJump />
              <CursorBar />
              <NowButton />
              <PrintExport />
            </div>
          </div>
          <TimeGrid />
        </main>
      </div>

      {/* 选区操作栏：仅在有选区时出现 */}
      <SelectionBar />

      {/*
        SEO 介绍与内链区：服务端渲染，含关键词导向文案与到热门时差对照页的
        站内链接（增强可索引正文与链接权重传递）。视觉上次要，对交互无影响。
      */}
      <footer className="border-t bg-white px-4 py-6 text-sm text-gray-600">
        <h2 className="text-base font-semibold text-gray-800 mb-2">
          {tSeo("introTitle")}
        </h2>
        <p className="max-w-3xl leading-relaxed">{tSeo("introBody")}</p>
        <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">
          {tSeo("popularTitle")}
        </h3>
        <nav>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {popularConverterLinks().map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/time-converter/${item.slug}`}
                  className="text-blue-600 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </footer>

      {/* WebApplication 结构化数据（富结果识别） */}
      <JsonLd
        data={webAppJsonLd({
          name: t("title"),
          url: localeUrl(locale, ""),
          description: t("tagline"),
        })}
      />
    </div>
  );
}
