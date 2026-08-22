import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import CitySearch from "@/components/CitySearch";
import PlacesPanel from "@/components/PlacesPanel";
import TimeGrid from "@/components/TimeGrid";
import SelectionBar from "@/components/SelectionBar";
import HeaderActions from "@/components/HeaderActions";
import GlassHeader from "@/components/GlassHeader";
import GridToolbar from "@/components/GridToolbar";
import DragGhostDemo from "@/components/DragGhostDemo";
import UrlStateSync from "@/components/UrlStateSync";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import LiveUtcClock from "@/components/LiveUtcClock";
import { Link } from "@/i18n/navigation";
import { CITY_BY_ID } from "@/data/cities";
import { localCityName } from "@/lib/cityName";
import type { AppLocale } from "@/i18n/routing";
import SiteFooter from "@/components/SiteFooter";
import {
  POPULAR_CITY_PAIRS,
  POPULAR_TZ_PAIRS,
  popularCityIds,
  webAppJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  localeUrl,
  getSiteUrl,
} from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

/** 热门时差对照内链：城市名随页面 locale，时区对显示缩写。 */
function popularConverterLinks(locale: AppLocale) {
  const city = POPULAR_CITY_PAIRS.map(([a, b]) => {
    const ca = CITY_BY_ID[a];
    const cb = CITY_BY_ID[b];
    const la = ca ? localCityName(locale, ca) : a;
    const lb = cb ? localCityName(locale, cb) : b;
    return { slug: `${a}--${b}`, label: `${la} ↔ ${lb}` };
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
    <div className="liquid-glass-backdrop flex min-h-screen flex-col text-ink">
      <UrlStateSync />
      <KeyboardShortcuts />

      {/* 顶部导航栏：品牌 · 城市搜索 · 语言/设置/主题。
          panel 层玻璃 + 折射（GlassHeader）；safe-top 避开全面屏安全区。 */}
      <GlassHeader>
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <h1 className="flex shrink-0 items-center gap-3">
            <span className="brand-orbit brand-orbit--sm">
              <Image
                src="/brand/worldtime-mark.svg"
                alt=""
                width={32}
                height={32}
                unoptimized
                priority
                className="brand-mark"
              />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[16px] font-semibold tracking-tight text-gradient">
                {t("title")}
              </span>
                <span className="text-[11px] tracking-wide text-muted">
                  {t("tagline")}
                </span>
            </span>
          </h1>

          <div className="min-w-0 flex-1 md:max-w-md">
            <CitySearch />
          </div>

          <LiveUtcClock />
          <HeaderActions />
        </div>
      </GlassHeader>

      {/* 主体：左侧地点列表面板 + 右侧网格工作区。
          面板与表头为抬升表面，网格区为内凹表面，构成「分层」深度。 */}
      <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col md:flex-row">
        <PlacesPanel />
        <main className="flex min-w-0 flex-1 flex-col">
          {/* 网格工具条：空状态（无城市）时自隐藏，见 GridToolbar */}
          <GridToolbar />

          {/* 网格（内凹表面）+ 首次拖选动效教学（幽灵选区演示一次后淡出，零文字） */}
          <div className="relative min-h-0 flex-1">
            <DragGhostDemo />
            <div className="h-full overflow-auto p-3 md:p-4">
              <TimeGrid />
            </div>
          </div>
        </main>
      </div>

      {/* 选区操作栏：仅在有选区时出现（固定浮于底部，抬升表面） */}
      <SelectionBar />

      {/*
        瘦 SEO 页脚：实体定义 + 热门城市/对照内链（首页权重传递）。
        功能/场景在 /about，FAQ 与 FAQPage JSON-LD 在 /faq。
      */}
      <footer className="border-t border-line bg-surface px-4 py-8 text-sm">
        <Reveal className="mx-auto max-w-5xl space-y-8">
          <section>
            <h2 className="text-gradient mb-2 text-base font-semibold tracking-tight">
              {tSeo("introTitle")}
            </h2>
            <p className="max-w-3xl leading-relaxed text-muted">{tSeo("introBody")}</p>
          </section>

          <section>
            <h3
              id="seo-cities"
              className="mb-3 text-[11px] font-semibold text-faint"
            >
              {tSeo("citiesTitle")}
            </h3>
            <nav aria-labelledby="seo-cities">
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                {popularCityIds().map((id) => {
                  const city = CITY_BY_ID[id];
                  if (!city) return null;
                  return (
                    <li key={id}>
                      <Link
                        href={`/time/${id}`}
                        className="text-accent underline underline-offset-2 transition-colors duration-150 hover:text-accent-hover"
                      >
                        {localCityName(locale as AppLocale, city)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </section>

          <section>
            <h3
              id="seo-converters"
              className="mb-3 text-[11px] font-semibold text-faint"
            >
              {tSeo("popularTitle")}
            </h3>
            <nav aria-labelledby="seo-converters">
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                {popularConverterLinks(locale as AppLocale).map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/time-converter/${item.slug}`}
                      className="text-accent underline underline-offset-2 transition-colors duration-150 hover:text-accent-hover"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </section>

          <SiteFooter locale={locale} />
        </Reveal>
      </footer>

      <JsonLd
        data={webAppJsonLd({
          name: t("title"),
          url: localeUrl(locale, ""),
          description: t("tagline"),
        })}
      />
      <JsonLd
        data={organizationJsonLd({
          url: getSiteUrl(),
          name: t("title"),
          description: tSeo("introBody"),
          aboutUrl: localeUrl(locale, "/about"),
        })}
      />
      <JsonLd
        data={websiteJsonLd({
          name: t("title"),
          description: tSeo("introBody"),
        })}
      />
    </div>
  );
}
