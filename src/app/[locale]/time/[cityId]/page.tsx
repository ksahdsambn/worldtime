import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import { CITY_BY_ID } from "@/data/cities";
import { localCityName, cityCountryName } from "@/lib/cityName";
import {
  buildCityNowFacts,
  convertersForCity,
  citiesInCountry,
} from "@/lib/cityFacts";
import { formatDstDate } from "@/lib/landingSlug";
import {
  buildAlternates,
  buildOpenGraph,
  webPageJsonLd,
  faqPageJsonLd,
  breadcrumbJsonLd,
  placeJsonLd,
  localeUrl,
  interp,
  popularCityIds,
  HREFLANG_MAP,
  SITEMAP_LASTMOD,
} from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import ContentHeader from "@/components/ContentHeader";
import SiteFooter from "@/components/SiteFooter";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import CityNow from "@/components/CityNow";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; cityId: string }>;
};

export function generateStaticParams() {
  const params: Array<{ locale: string; cityId: string }> = [];
  for (const locale of routing.locales) {
    for (const cityId of popularCityIds()) {
      params.push({ locale, cityId });
    }
  }
  return params;
}

export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; cityId: string }>;
}): Promise<Metadata> {
  const { locale, cityId } = await params;
  const t = await getTranslations({ locale, namespace: "City" });
  const id = cityId.toLowerCase();
  const city = CITY_BY_ID[id];
  const path = `/time/${id}`;
  if (!city) {
    // 未知城市：在 generateMetadata 阶段即抛 notFound，抢在流式 shell 提交
    // （loading 边界）之前，让响应携带真正的 404 状态而非 200 软 404。
    notFound();
  }
  const name = localCityName(locale as AppLocale, city);
  const country = cityCountryName(locale as AppLocale, city);
  const title = t("title", { city: name });
  const description = t("metaDescription", {
    city: name,
    country,
    zone: city.timeZone,
  });
  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: buildOpenGraph(locale, { title, description, path }),
  };
}

export default async function CityPage({ params }: Props) {
  const { locale, cityId } = await params;
  setRequestLocale(locale);
  const city = CITY_BY_ID[cityId.toLowerCase()];
  if (!city) notFound();

  const t = await getTranslations({ locale, namespace: "City" });
  const tApp = await getTranslations({ locale, namespace: "App" });
  const loc = locale as AppLocale;
  const name = localCityName(loc, city);
  const country = cityCountryName(loc, city);
  const nowMs = Date.now();
  const facts = buildCityNowFacts(city.timeZone, nowMs, locale);
  const path = `/time/${city.id}`;
  const pageUrl = localeUrl(locale, path);

  const dstAnswer = !facts.nextDstMs && !facts.inDst
    ? t("noDst")
    : facts.inDst
      ? t("dstYes")
      : t("dstNo");

  const faqRaw = t.raw("faq") as Array<{ q: string; a: string }>;
  const faqVars = {
    city: name,
    country,
    time: facts.time,
    date: facts.date,
    offset: facts.offsetLabel,
    zone: city.timeZone,
    dstAnswer,
  };
  const faqItems = faqRaw.map((it) => ({
    q: interp(it.q, faqVars),
    a: interp(it.a, faqVars),
  }));

  const pairs = convertersForCity(city.id);
  const siblings = citiesInCountry(city.countryCode)
    .filter((c) => c.id !== city.id)
    .slice(0, 24);

  return (
    <div className="liquid-glass-backdrop min-h-screen">
      <ContentHeader locale={locale} />
      <main className="mx-auto max-w-2xl px-4 py-10 text-ink sm:py-16">
        <PageBreadcrumb
          items={[
            { href: "/", label: t("breadcrumbHome") },
            { href: `/country/${city.countryCode.toLowerCase()}`, label: country },
            { label: name },
          ]}
        />
        <header className="animate-fade-up mb-8">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {country}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[32px]">
            {t("title", { city: name })}
          </h1>
          <CityNow
            timeZone={city.timeZone}
            locale={locale}
            initialMs={nowMs}
            dstYes={t("dstYes")}
            dstNo={t("dstNo")}
            noDst={t("noDst")}
            nextDstLabel={t("nextDst")}
          />
          <p className="mt-4 leading-relaxed text-muted">
            {t("intro", {
              city: name,
              country,
              time: facts.time,
              date: facts.date,
              zone: city.timeZone,
              offset: facts.offsetLabel,
            })}
          </p>
        </header>

        <dl className="hud-frame divide-y divide-line text-sm">
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted">{t("country")}</dt>
            <dd>
              <Link
                href={`/country/${city.countryCode.toLowerCase()}`}
                className="text-accent underline underline-offset-2"
              >
                {country}
              </Link>
            </dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted">{t("iana")}</dt>
            <dd className="chrono">{city.timeZone}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted">{t("utcOffset")}</dt>
            <dd className="chrono">UTC {facts.offsetLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted">{t("dst")}</dt>
            <dd>{dstAnswer}</dd>
          </div>
          {facts.nextDstMs ? (
            <div className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted">{t("nextDstLabel")}</dt>
              <dd className="chrono">{formatDstDate(facts.nextDstMs, city.timeZone, locale)}</dd>
            </div>
          ) : null}
        </dl>

        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold text-gradient">{t("workHours")}</h2>
          <p className="text-sm text-muted">{t("workHoursBody", { city: name })}</p>
        </section>

        {pairs.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold text-gradient">{t("convertersTitle")}</h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {pairs.map(([a, b]) => {
                const ca = CITY_BY_ID[a];
                const cb = CITY_BY_ID[b];
                const la = ca ? localCityName(loc, ca) : a;
                const lb = cb ? localCityName(loc, cb) : b;
                return (
                  <li key={`${a}--${b}`}>
                    <Link
                      href={`/time-converter/${a}--${b}`}
                      className="text-accent underline underline-offset-2 hover:text-accent-hover"
                    >
                      {la} ↔ {lb}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {siblings.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold text-gradient">
              {t("moreInCountry", { country })}
            </h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {siblings.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/time/${c.id}`}
                    className="text-accent underline underline-offset-2 hover:text-accent-hover"
                  >
                    {localCityName(loc, c)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
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

        <p className="mt-8">
          <Link href="/" className="btn btn-primary btn-sm">
            {t("openInGrid")}
          </Link>
        </p>

        <div className="mt-12">
          <SiteFooter locale={locale} />
        </div>

        <JsonLd
          data={webPageJsonLd({
            name: t("title", { city: name }),
            url: pageUrl,
            description: t("metaDescription", { city: name, country, zone: city.timeZone }),
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
            { name: country, url: localeUrl(locale, `/country/${city.countryCode.toLowerCase()}`) },
            { name, url: pageUrl },
          ])}
        />
        <JsonLd
          data={placeJsonLd({
            name,
            countryName: country,
            timeZone: city.timeZone,
          })}
        />
      </main>
    </div>
  );
}
