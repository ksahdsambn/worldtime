import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
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
  faqPageJsonLd,
  organizationJsonLd,
  localeUrl,
  getSiteUrl,
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
  // 数组类文案（功能/场景/FAQ）用 raw() 取原始数组，组件层 .map 渲染。
  const features = tSeo.raw("features") as Array<{ title: string; desc: string }>;
  const useCases = tSeo.raw("useCases") as Array<{ title: string; desc: string }>;
  const faq = tSeo.raw("faq") as Array<{ q: string; a: string }>;

  return (
    <div className="flex min-h-screen flex-col">
      <UrlStateSync />
      <KeyboardShortcuts />
      {/* 顶部导航栏：品牌、城市搜索、语言切换、设置（设置入口后续步骤补全） */}
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2 bg-white">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Image src="/brand/worldtime-mark.svg" alt="" width={28} height={28} priority />
          {t("title")}
        </h1>
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
        SEO 介绍与内链区：服务端渲染，含功能 / 使用场景 / FAQ 关键词导向文案，
        以及到热门时差对照页的站内链接（增强可索引正文与链接权重传递）。
        视觉上次要，对交互无影响。
      */}
      <footer className="border-t bg-white px-4 py-8 text-sm text-gray-600">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-base font-semibold text-gray-800 mb-2">
            {tSeo("introTitle")}
          </h2>
          <p className="max-w-3xl leading-relaxed">{tSeo("introBody")}</p>

          {/* 核心功能 */}
          <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">
            {tSeo("featuresTitle")}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            {features.map((f) => (
              <li key={f.title}>
                <span className="font-medium text-gray-800">{f.title}</span>
                <span className="block text-gray-600">{f.desc}</span>
              </li>
            ))}
          </ul>

          {/* 使用场景 */}
          <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">
            {tSeo("useCasesTitle")}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            {useCases.map((u) => (
              <li key={u.title}>
                <span className="font-medium text-gray-800">{u.title}</span>
                <span className="block text-gray-600">{u.desc}</span>
              </li>
            ))}
          </ul>

          {/* 常见问题（FAQ）—— 文本在 DOM 内，驱动 FAQPage 结构化数据 */}
          <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">
            {tSeo("faqTitle")}
          </h3>
          <ul className="max-w-3xl divide-y divide-gray-200">
            {faq.map((item) => (
              <li key={item.q} className="py-2">
                <p className="font-medium text-gray-800">{item.q}</p>
                <p className="text-gray-600">{item.a}</p>
              </li>
            ))}
          </ul>

          {/* 热门时区转换内链 */}
          <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">
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
        </div>
      </footer>

      {/* 结构化数据：WebApplication + Organization + FAQPage（富结果识别） */}
      <JsonLd
        data={webAppJsonLd({
          name: t("title"),
          url: localeUrl(locale, ""),
          description: t("tagline"),
        })}
      />
      <JsonLd data={organizationJsonLd({ url: getSiteUrl(), name: t("title") })} />
      <JsonLd
        data={faqPageJsonLd(faq.map((it) => ({ question: it.q, answer: it.a })))}
      />
    </div>
  );
}
