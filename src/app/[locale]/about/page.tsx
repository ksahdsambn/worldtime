import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
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

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  const path = "/about";
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: buildAlternates(locale, path),
    openGraph: buildOpenGraph(locale, {
      title: t("title"),
      description: t("metaDescription"),
      path,
    }),
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "About" });
  const tApp = await getTranslations({ locale, namespace: "App" });
  const tSeo = await getTranslations({ locale, namespace: "Seo" });
  const pageUrl = localeUrl(locale, "/about");
  const featuresRaw = tSeo.raw("features");
  const useCasesRaw = tSeo.raw("useCases");
  const features = Array.isArray(featuresRaw)
    ? (featuresRaw as Array<{ title: string; desc: string }>)
    : [];
  const useCases = Array.isArray(useCasesRaw)
    ? (useCasesRaw as Array<{ title: string; desc: string }>)
    : [];

  return (
    <div className="liquid-glass-backdrop min-h-screen">
      <ContentHeader locale={locale} />
      <main className="site-shell px-4 py-10 text-ink sm:py-16">
        <PageBreadcrumb
          items={[
            { href: "/", label: t("breadcrumbHome") },
            { label: t("title") },
          ]}
        />
        <h1 className="text-2xl font-bold tracking-tight sm:text-[32px]">{t("title")}</h1>
        <p className="mt-4 leading-relaxed text-muted">{t("lead")}</p>

        {features.length > 0 ? (
          <>
            <h2 className="mt-10 text-base font-semibold text-gradient">{tSeo("featuresTitle")}</h2>
            <dl className="mt-4 divide-y divide-line">
              {features.map((f) => (
                <div key={f.title} className="py-3 first:pt-0">
                  <dt className="font-medium text-ink">{f.title}</dt>
                  <dd className="mt-1 leading-relaxed text-muted">{f.desc}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        {useCases.length > 0 ? (
          <>
            <h2 className="mt-10 text-base font-semibold text-gradient">{tSeo("useCasesTitle")}</h2>
            <dl className="mt-4 divide-y divide-line">
              {useCases.map((u) => (
                <div key={u.title} className="py-3 first:pt-0">
                  <dt className="font-medium text-ink">{u.title}</dt>
                  <dd className="mt-1 leading-relaxed text-muted">{u.desc}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        <h2 className="mt-10 text-base font-semibold text-gradient">{t("howTitle")}</h2>
        <p className="mt-2 leading-relaxed text-muted">{t("howBody")}</p>

        <h2 className="mt-8 text-base font-semibold text-gradient">{t("dataTitle")}</h2>
        <p className="mt-2 leading-relaxed text-muted">{t("dataBody")}</p>

        <h2 className="mt-8 text-base font-semibold text-gradient">{t("dstTitle")}</h2>
        <p className="mt-2 leading-relaxed text-muted">{t("dstBody")}</p>

        <h2 className="mt-8 text-base font-semibold text-gradient">{t("shareTitle")}</h2>
        <p className="mt-2 leading-relaxed text-muted">{t("shareBody")}</p>

        <h2 className="mt-8 text-base font-semibold text-gradient">{t("offlineTitle")}</h2>
        <p className="mt-2 leading-relaxed text-muted">{t("offlineBody")}</p>

        <p className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted">
          <Link href="/privacy" className="text-accent underline underline-offset-2 transition-colors duration-150 hover:text-accent-hover">
            {t("privacyBlurb")}
          </Link>
          <Link href="/terms" className="text-accent underline underline-offset-2 transition-colors duration-150 hover:text-accent-hover">
            {t("termsBlurb")}
          </Link>
        </p>

        <div className="mt-12">
          <SiteFooter locale={locale} current="about" />
        </div>

        <JsonLd
          data={webPageJsonLd({
            name: t("title"),
            url: pageUrl,
            description: t("metaDescription"),
            inLanguage: HREFLANG_MAP[locale] ?? locale,
            dateModified: SITEMAP_LASTMOD,
          })}
        />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: tApp("title"), url: localeUrl(locale, "") },
            { name: t("title"), url: pageUrl },
          ])}
        />
      </main>
    </div>
  );
}
