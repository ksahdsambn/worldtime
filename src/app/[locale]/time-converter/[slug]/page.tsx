import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatOffset } from "@/lib/time";
import { parseSlug, buildComparisonState } from "@/lib/landingSlug";
import { LandingHero, LandingTable } from "@/components/LandingComparison";
import { routing } from "@/i18n/routing";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import {
  POPULAR_CITY_PAIRS,
  POPULAR_TZ_PAIRS,
  buildAlternates,
  buildOpenGraph,
  webAppJsonLd,
  faqPageJsonLd,
  localeUrl,
} from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { CITY_BY_ID } from "@/data/cities";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/** 着陆页 FAQ 占位符替换：模板仅含简单 {var}（无 ICU plural/select），手工替换即安全。 */
function interpFaq(
  tpl: string,
  vars: { a: string; b: string; offset: string; dir: string },
): string {
  return tpl
    .replaceAll("{a}", vars.a)
    .replaceAll("{b}", vars.b)
    .replaceAll("{offset}", vars.offset)
    .replaceAll("{dir}", vars.dir);
}

/**
 * 相关转换器互链：返回热门配对（排除当前 slug），供着陆页底部内链，
 * 增强站内链接权重传递。城市对显示英文名，时区对显示缩写。
 */
function relatedConverterLinks(currentSlug: string): Array<{ slug: string; label: string }> {
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
  return [...city, ...tz].filter((x) => x.slug !== currentSlug);
}

/**
 * SEO 着陆页（第五章 LP-1~5）。
 *
 * slug 采用「--」（双连字符）作为两段分隔符，避免与城市 id 内的
 * 单连字符（如 cn-hohhot-east）冲突。形如：
 * - 城市对："cn-beijing--us-new-york"
 * - 时区缩写对："EST--PST"
 *
 * 兼容：旧式以单连字符拼接的缩写对（如 "EST-PST"）仍可解析，
 * 因为时区缩写不含连字符。
 *
 * 渲染策略：构建期静态生成（generateStaticParams 枚举热门组合），
 * 其余长尾组合按需生成（ISR，dynamicParams 默认允许）。
 * 服务端返回的原始 HTML 即含完整时差与对照表内容。
 *
 * SEO：每页输出 canonical + 全语言 hreflang（含 x-default），用同名 slug
 * 把 11 语言版本收束到同一组对照页，避免重复内容惩罚。
 * 第 14 轮：补充关键词引言段、FAQ（→ FAQPage JSON-LD）、相关转换器互链。
 */

export function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  // 遍历所有支持语言（新增语言后自动覆盖，无需手动维护此列表）
  for (const locale of routing.locales) {
    // 城市对（以「--」分隔）
    for (const [a, b] of POPULAR_CITY_PAIRS) {
      params.push({ locale, slug: `${a}--${b}` });
    }
    // 时区缩写对（以「--」分隔）
    for (const [a, b] of POPULAR_TZ_PAIRS) {
      params.push({ locale, slug: `${a}--${b}` });
    }
  }
  return params;
}

// 允许长尾组合按需生成（ISR）
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  const info = parseSlug(slug);
  const path = `/time-converter/${slug}`;
  if (!info) {
    return {
      title: t("title"),
      description: t("description"),
      alternates: buildAlternates(locale, path),
      openGraph: buildOpenGraph(locale, {
        title: t("title"),
        description: t("description"),
        path,
      }),
    };
  }
  // title 仅声明页面名，品牌后缀由 layout template 追加（避免重复品牌）
  const title = `${info.aLabel} ↔ ${info.bLabel} · ${t("title")}`;
  // 第 14 轮：description 改为独立成句的 metaDescription 模板（含 {a}/{b}）。
  const description = t("metaDescription", { a: info.aLabel, b: info.bLabel });
  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: buildOpenGraph(locale, { title, description, path }),
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  // async server component 中不能用 hook，用 getTranslations 替代 useTranslations
  const t = await getTranslations({ locale, namespace: "Landing" });
  const info = parseSlug(slug);
  if (!info) notFound();

  // 服务端"当前"时刻用于对照表首帧（ISR 烘焙，供 SSR/爬虫）。
  // 客户端挂载后由 LandingHero/LandingTable 每分钟实时重算，
  // 不再受 revalidate=3600 的「至多滞后 1 小时」限制。
  const initial = buildComparisonState(Date.now(), info.aZone, info.bZone);
  // FAQ 中的时差数字随服务端生成（ISR 窗口内静态），与首帧一致。
  const diff = initial.diffMinutes;

  const pageTitle = `${info.aLabel} ↔ ${info.bLabel} · ${t("title")}`;

  // FAQ：模板含 {a}/{b}/{offset}/{dir} 占位符，用当前配对的真实时差填充。
  // offset 取绝对值（带单位由各语言模板负责），方向由 {dir} 单独表达，
  // 避免「-12 落后」这类符号与方向词同时出现的语义冗余。
  // formatOffset 对正数会带前导 "+"，这里去掉，得到纯数值（如 "12" / "5:30"）。
  const faqRaw = t.raw("faq") as Array<{ q: string; a: string }>;
  const faqVars = {
    a: info.aLabel,
    b: info.bLabel,
    offset: formatOffset(Math.abs(diff)).replace(/^\+/, ""),
    dir: diff >= 0 ? t("dirAhead") : t("dirBehind"),
  };
  const faqItems = faqRaw.map((it) => ({
    q: interpFaq(it.q, faqVars),
    a: interpFaq(it.a, faqVars),
  }));

  // pairKind 仅作 h1 上方的「 eyebrow 」小标签，弱化呈现，强化 h1 主标题层级。
  const pairKind = info.kind === "city" ? t("cityPair") : t("tzPair");

  return (
    <div className="liquid-glass-backdrop min-h-screen">
      <main className="mx-auto max-w-2xl px-4 py-10 text-ink sm:py-16">
      <header className="animate-fade-up mb-8">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {pairKind}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[32px]">
          {info.aLabel} <span className="text-gradient">↔</span> {info.bLabel}
        </h1>

        {/* 时差 hero + 方向句：客户端实时（每分钟重算，见 LandingComparison） */}
        <LandingHero
          aZone={info.aZone}
          bZone={info.bZone}
          aLabel={info.aLabel}
          bLabel={info.bLabel}
          initial={initial}
        />
        {/* 关键词导向引言段（含 {a}/{b}） */}
        <p className="mt-3 leading-relaxed text-muted">
          {t("intro", { a: info.aLabel, b: info.bLabel })}
        </p>
      </header>

      {/* 典型时段对照表：客户端实时（每分钟重算，见 LandingComparison） */}
      <LandingTable
        aZone={info.aZone}
        bZone={info.bZone}
        aLabel={info.aLabel}
        bLabel={info.bLabel}
        initial={initial}
      />
      {info.kind === "tz" && (
        <p className="mt-3 text-sm text-muted">
          {info.aLabel} = {info.aName} ({info.aZone}); {info.bLabel} = {info.bName} ({info.bZone}).
        </p>
      )}

      {/* 常见问题（FAQ）—— 文本在 DOM 内，驱动 FAQPage 结构化数据 */}
      <Reveal className="mt-10" delay={60}>
        <section>
          <h2 className="mb-3 text-base font-semibold text-gradient">{t("faqTitle")}</h2>
          <ul className="divide-y divide-line">
            {faqItems.map((item) => (
              <li key={item.q} className="py-3">
                <p className="font-medium text-ink">{item.q}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.a}</p>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      {/* 相关转换器互链 */}
      <Reveal className="mt-10" delay={120}>
        <section>
          <h2 className="mb-3 text-base font-semibold text-gradient">{t("relatedTitle")}</h2>
          <nav>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {relatedConverterLinks(slug).map((item) => (
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

      <JsonLd
        data={webAppJsonLd({
          name: pageTitle,
          url: localeUrl(locale, `/time-converter/${slug}`),
          description: t("metaDescription", { a: info.aLabel, b: info.bLabel }),
        })}
      />
      <JsonLd
        data={faqPageJsonLd(faqItems.map((it) => ({ question: it.q, answer: it.a })))}
      />
      </main>
    </div>
  );
}
