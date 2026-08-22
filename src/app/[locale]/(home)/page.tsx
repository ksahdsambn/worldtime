import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import CitySearch from "@/components/CitySearch";
import Workspace from "@/components/Workspace";
import HeaderActions from "@/components/HeaderActions";
import GlassHeader from "@/components/GlassHeader";
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
          {/* 移动端允许压缩换行（ru/vi 长标语），桌面端保持不缩放原样 */}
          <h1 className="flex min-w-0 items-center gap-3 md:shrink-0">
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
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-[16px] font-semibold tracking-tight text-gradient">
                {t("title")}
              </span>
                <span className="break-words text-[11px] tracking-wide text-muted">
                  {t("tagline")}
                </span>
            </span>
          </h1>

          {/* 移动端独占一行（避免被长标语挤瘪），桌面端恢复弹性中列 */}
          <div className="w-full min-w-0 md:max-w-md md:flex-1">
            <CitySearch />
          </div>

          <LiveUtcClock />
          <HeaderActions />
        </div>
      </GlassHeader>

      {/* 工作区：一页两态（时钟时间卡 / 重叠排期网格）。
          模式分段 + 时间控制条为玻璃工作条；网格区为内凹表面，构成「分层」深度。
          选区操作栏由 Workspace 在排期视图内挂载（仅在有选区时出现）。 */}
      <Workspace />

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
