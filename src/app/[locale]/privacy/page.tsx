import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
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
import LegalSections from "@/components/LegalSections";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  const path = "/privacy";
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

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Privacy" });
  const tApp = await getTranslations({ locale, namespace: "App" });
  const pageUrl = localeUrl(locale, "/privacy");
  const sectionsRaw = t.raw("sections");
  const sections = Array.isArray(sectionsRaw)
    ? (sectionsRaw as Array<{ heading: string; paragraphs: string[] }>)
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
        <p className="mt-2 text-sm text-muted">{t("updated")}</p>
        <p className="mt-4 leading-relaxed text-muted">{t("lead")}</p>
        <LegalSections sections={sections} />
        <div className="mt-12">
          <SiteFooter locale={locale} current="privacy" />
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
