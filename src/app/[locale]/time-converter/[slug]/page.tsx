import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatOffset } from "@/lib/time";
import {
  parseSlug,
  buildComparisonState,
  overlappingWorkHours,
  collapseHourRanges,
  formatHourRange,
  zoneDstFacts,
  formatDstDate,
  localizedPairLabels,
} from "@/lib/landingSlug";
import { LandingHero, LandingTable } from "@/components/LandingComparison";
import { routing, type AppLocale } from "@/i18n/routing";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import ContentHeader from "@/components/ContentHeader";
import SiteFooter from "@/components/SiteFooter";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import {
  POPULAR_CITY_PAIRS,
  POPULAR_TZ_PAIRS,
  buildAlternates,
  buildOpenGraph,
  webPageJsonLd,
  faqPageJsonLd,
  breadcrumbJsonLd,
  localeUrl,
  interp,
  canonicalLandingSlug,
  HREFLANG_MAP,
  SITEMAP_LASTMOD,
} from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { CITY_BY_ID } from "@/data/cities";
import { localCityName } from "@/lib/cityName";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function relatedConverterLinks(
  currentSlug: string,
  locale: AppLocale,
): Array<{ slug: string; label: string }> {
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
  return [...city, ...tz].filter((x) => x.slug !== currentSlug);
}

export function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  for (const locale of routing.locales) {
    for (const [a, b] of POPULAR_CITY_PAIRS) {
      params.push({ locale, slug: `${a}--${b}` });
    }
    for (const [a, b] of POPULAR_TZ_PAIRS) {
      params.push({ locale, slug: `${a}--${b}` });
    }
  }
  return params;
}

export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  const info = parseSlug(slug);
  const canon = canonicalLandingSlug(slug);
  const path = `/time-converter/${canon}`;
  if (!info) {
    // 不可解析 slug：尽早抛 notFound，保证 404 状态（见 time/[cityId] 同注）
    notFound();
  }
  const labels = localizedPairLabels(info, locale as AppLocale);
  const title = `${labels.a} ↔ ${labels.b} · ${t("title")}`;
  const description = t("metaDescription", { a: labels.a, b: labels.b });
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
  const t = await getTranslations({ locale, namespace: "Landing" });
  const tApp = await getTranslations({ locale, namespace: "App" });
  const info = parseSlug(slug);
  if (!info) notFound();

  const labels = localizedPairLabels(info, locale as AppLocale);
  const nowMs = Date.now();
  const initial = buildComparisonState(nowMs, info.aZone, info.bZone, locale);
  const diff = initial.diffMinutes;
  const pageTitle = `${labels.a} ↔ ${labels.b} · ${t("title")}`;
  const path = `/time-converter/${canonicalLandingSlug(slug)}`;
  const pageUrl = localeUrl(locale, path);

  const overlapSlots = overlappingWorkHours(nowMs, info.aZone, info.bZone);
  const overlapRanges = collapseHourRanges(overlapSlots.map((s) => s.aHourNum));
  const overlapHours = overlapRanges.map((r) => formatHourRange(r.start, r.end)).join(", ");
  const overlapText = overlapSlots.length
    ? t("overlapBody", { a: labels.a, b: labels.b, hours: overlapHours })
    : t("overlapNone", { a: labels.a, b: labels.b });

  const aDst = zoneDstFacts(info.aZone, nowMs);
  const bDst = zoneDstFacts(info.bZone, nowMs);

  const faqRaw = t.raw("faq") as Array<{ q: string; a: string }>;
  const faqVars = {
    a: labels.a,
    b: labels.b,
    offset: formatOffset(Math.abs(diff)).replace(/^\+/, ""),
    dir: diff >= 0 ? t("dirAhead") : t("dirBehind"),
    overlap: overlapText,
    aTime: initial.aNow,
    bTime: initial.bNow,
  };
  const faqItems = faqRaw.map((it) => ({
    q: interp(it.q, faqVars),
    a: interp(it.a, faqVars),
  }));

  const pairKind = info.kind === "city" ? t("cityPair") : t("tzPair");
  const relatedCities: Array<{ href: string; label: string }> = [];
  if (info.kind === "city") {
    const ca = CITY_BY_ID[info.aId];
    const cb = CITY_BY_ID[info.bId];
    if (ca) relatedCities.push({ href: `/time/${ca.id}`, label: labels.a });
    if (cb) relatedCities.push({ href: `/time/${cb.id}`, label: labels.b });
  }

  function dstLine(
    place: string,
    facts: ReturnType<typeof zoneDstFacts>,
    zone: string,
  ): string {
    if (!facts.observesDst) return t("dstNone", { place });
    const abbr = facts.abbrev || facts.offsetLabel;
    const base = facts.inDst
      ? t("dstActive", { place, abbr })
      : t("dstInactive", { place, abbr });
    if (!facts.nextMs) return base;
    return `${base} ${t("nextDst", { date: formatDstDate(facts.nextMs, zone, locale) })}`;
  }

  const crumbs = [
    { href: "/", label: t("breadcrumbHome") },
    { label: `${labels.a} ↔ ${labels.b}` },
  ];

  return (
    <div className="liquid-glass-backdrop min-h-screen">
      <ContentHeader locale={locale} />
      <main className="mx-auto max-w-2xl px-4 py-10 text-ink sm:py-16">
        <PageBreadcrumb items={crumbs} />
        <header className="animate-fade-up mb-8">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {pairKind}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[32px]">
            {labels.a} <span className="text-gradient">↔</span> {labels.b}
          </h1>

          <LandingHero
            aZone={info.aZone}
            bZone={info.bZone}
            aLabel={labels.a}
            bLabel={labels.b}
            locale={locale}
            initial={initial}
          />
          <p className="mt-3 leading-relaxed text-muted">
            {t("intro", { a: labels.a, b: labels.b })}
          </p>
        </header>

        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold text-gradient">{t("overlapTitle")}</h2>
          <p className="leading-relaxed text-muted">{overlapText}</p>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold text-gradient">{t("dstHeading")}</h2>
          <p className="text-sm leading-relaxed text-muted">{dstLine(labels.a, aDst, info.aZone)}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{dstLine(labels.b, bDst, info.bZone)}</p>
        </section>

        <LandingTable
          aZone={info.aZone}
          bZone={info.bZone}
          aLabel={labels.a}
          bLabel={labels.b}
          locale={locale}
          initial={initial}
        />
        {info.kind === "tz" && (
          <p className="mt-3 text-sm text-muted">
            {t("tzAbbrNote", {
              label: info.aLabel,
              name: info.aName,
              zone: info.aZone,
              abbr: aDst.abbrev ?? info.aLabel,
            })}{" "}
            {t("tzAbbrNote", {
              label: info.bLabel,
              name: info.bName,
              zone: info.bZone,
              abbr: bDst.abbrev ?? info.bLabel,
            })}
          </p>
        )}

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

        {relatedCities.length > 0 && (
          <Reveal className="mt-10" delay={90}>
            <section>
              <h2 className="mb-3 text-base font-semibold text-gradient">{t("relatedCitiesTitle")}</h2>
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                {relatedCities.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-accent underline underline-offset-2 hover:text-accent-hover"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}

        <Reveal className="mt-10" delay={120}>
          <section>
            <h2 className="mb-3 text-base font-semibold text-gradient">{t("relatedTitle")}</h2>
            <nav>
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                {relatedConverterLinks(slug, locale as AppLocale).map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/time-converter/${item.slug}`}
                      className="text-accent underline underline-offset-2 hover:text-accent-hover"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </section>
        </Reveal>

        <div className="mt-12">
          <SiteFooter locale={locale} />
        </div>

        <JsonLd
          data={webPageJsonLd({
            name: pageTitle,
            url: pageUrl,
            description: t("metaDescription", { a: labels.a, b: labels.b }),
            inLanguage: HREFLANG_MAP[locale] ?? locale,
            dateModified: SITEMAP_LASTMOD,
          })}
        />
        <JsonLd
          data={faqPageJsonLd(faqItems.map((it) => ({ question: it.q, answer: it.a })))}
        />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: tApp("title"), url: localeUrl(locale, "") },
            { name: `${labels.a} ↔ ${labels.b}`, url: pageUrl },
          ])}
        />
      </main>
    </div>
  );
}
