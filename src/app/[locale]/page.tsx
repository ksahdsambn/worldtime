import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import CitySearch from "@/components/CitySearch";
import PlacesPanel from "@/components/PlacesPanel";
import TimeGrid from "@/components/TimeGrid";
import SelectionBar from "@/components/SelectionBar";
import HeaderActions from "@/components/HeaderActions";
import GlassHeader from "@/components/GlassHeader";
import GridToolbar from "@/components/GridToolbar";
import DragHintCoachmark from "@/components/DragHintCoachmark";
import UrlStateSync from "@/components/UrlStateSync";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import LiveUtcClock from "@/components/LiveUtcClock";
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
              <span className="hidden text-[11px] tracking-wide text-muted sm:block">
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

          {/* 网格（内凹表面）+ 首次拖拽上下文提示（浮于可见顶部，不随滚动） */}
          <div className="relative min-h-0 flex-1">
            <DragHintCoachmark />
            <div className="h-full overflow-auto p-3 md:p-4">
              <TimeGrid />
            </div>
          </div>
        </main>
      </div>

      {/* 选区操作栏：仅在有选区时出现（固定浮于底部，抬升表面） */}
      <SelectionBar />

      {/*
        SEO 介绍与内链区：服务端渲染，含功能 / 使用场景 / FAQ 关键词导向文案，
        以及到热门时差对照页的站内链接（增强可索引正文与链接权重传递）。
        视觉上次要，对交互无影响；文案与结构化数据完整保留。
      */}
      <footer className="border-t border-line bg-surface px-4 py-12 text-sm">
        <Reveal className="mx-auto max-w-5xl space-y-10">
          <section>
            <h2 className="text-gradient mb-2 text-lg font-semibold tracking-tight">
              {tSeo("introTitle")}
            </h2>
            <p className="max-w-3xl leading-relaxed text-muted">{tSeo("introBody")}</p>
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
              {tSeo("featuresTitle")}
            </h3>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Reveal as="li" key={f.title} delay={i * 50} className="feature-card">
                  <span className="font-medium text-ink">{f.title}</span>
                  <span className="mt-1 block text-muted">{f.desc}</span>
                </Reveal>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
              {tSeo("useCasesTitle")}
            </h3>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((u, i) => (
                <Reveal as="li" key={u.title} delay={i * 50} className="feature-card">
                  <span className="font-medium text-ink">{u.title}</span>
                  <span className="mt-1 block text-muted">{u.desc}</span>
                </Reveal>
              ))}
            </ul>
          </section>

          {/* 常见问题（FAQ）—— 文本在 DOM 内，驱动 FAQPage 结构化数据 */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
              {tSeo("faqTitle")}
            </h3>
            <ul className="max-w-3xl divide-y divide-line">
              {faq.map((item) => (
                <li key={item.q} className="py-3">
                  <p className="font-medium text-ink">{item.q}</p>
                  <p className="mt-1 text-muted">{item.a}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* 热门时区转换内链 */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
              {tSeo("popularTitle")}
            </h3>
            <nav>
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                {popularConverterLinks().map((item) => (
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
        </Reveal>
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
