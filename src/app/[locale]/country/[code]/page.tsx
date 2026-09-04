import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import { localCityName, localCountryName } from "@/lib/cityName";
import {
  citiesInCountry,
  countryByCode,
  popularCountryCodes,
  uniqueTimeZones,
} from "@/lib/cityFacts";
import {
  buildAlternates,
  buildOpenGraph,
  webPageJsonLd,
  breadcrumbJsonLd,
  localeUrl,
  HREFLANG_MAP,
  SITEMAP_LASTMOD,
} from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import ContentHeader from "@/components/ContentHeader";
import SiteFooter from "@/components/SiteFooter";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

export function generateStaticParams() {
  const params: Array<{ locale: string; code: string }> = [];
  for (const locale of routing.locales) {
    for (const code of popularCountryCodes()) {
      params.push({ locale, code: code.toLowerCase() });
    }
  }
  return params;
}

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "Country" });
  const cities = citiesInCountry(code);
  const path = `/country/${code.toLowerCase()}`;
  if (cities.length === 0) {
    // 无收录城市的国家码：尽早抛 notFound，保证 404 状态（见 time/[cityId] 同注）
    notFound();
  }
  const country = localCountryName(locale as AppLocale, countryByCode(code));
  const title = t("title", { country });
  const description = t("metaDescription", { country });
  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: buildOpenGraph(locale, { title, description, path }),
  };
}

export default async function CountryPage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const cities = citiesInCountry(code);
  if (cities.length === 0) notFound();

  const t = await getTranslations({ locale, namespace: "Country" });
  const tApp = await getTranslations({ locale, namespace: "App" });
  const loc = locale as AppLocale;
  const countryRec = countryByCode(code);
  const country = localCountryName(loc, countryRec);
  const zones = uniqueTimeZones(cities);
  const path = `/country/${code.toLowerCase()}`;
  const pageUrl = localeUrl(locale, path);

  return (
    <div className="relative z-[1] min-h-screen">
      <ContentHeader locale={locale} />
      <main className="site-shell px-4 py-10 text-ink sm:py-16">
        <PageBreadcrumb
          locale={locale}
          items={[
            { href: "/", label: t("breadcrumbHome") },
            { label: country },
          ]}
        />
        <header className="animate-fade-up mb-8">
          <h1 className="page-title">
            {t("title", { country })}
          </h1>
          <p className="page-lede">
            {t("intro", { country, zones: String(zones.length) })}
          </p>
        </header>

        <p className="mb-4 text-sm text-muted">{t("zoneCount", { n: String(zones.length) })}</p>
        <ul className="mb-8 flex flex-wrap gap-1.5 text-xs text-faint">
          {zones.map((z) => (
            <li key={z} className="chrono link-chip">
              {z}
            </li>
          ))}
        </ul>

        <h2 className="mb-3 text-base font-semibold text-gradient">{t("citiesTitle")}</h2>
        <ul className="flex flex-wrap gap-1.5">
          {cities.map((c) => (
            <li key={c.id}>
              <Link
                href={`/time/${c.id}`}
                className="link-chip"
                title={c.timeZone}
              >
                <span aria-hidden>{c.flag}</span> {localCityName(loc, c)}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <SiteFooter locale={locale} />
        </div>

        <JsonLd
          data={webPageJsonLd({
            name: t("title", { country }),
            url: pageUrl,
            description: t("metaDescription", { country }),
            inLanguage: HREFLANG_MAP[locale] ?? locale,
            dateModified: SITEMAP_LASTMOD,
          })}
        />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: tApp("title"), url: localeUrl(locale, "") },
            { name: country, url: pageUrl },
          ])}
        />
      </main>
    </div>
  );
}
