import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import {
  buildAlternates,
  buildOpenGraph,
  webPageJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
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
  const t = await getTranslations({ locale, namespace: "Faq" });
  const path = "/faq";
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

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Faq" });
  const tApp = await getTranslations({ locale, namespace: "App" });
  const tSeo = await getTranslations({ locale, namespace: "Seo" });
  const pageUrl = localeUrl(locale, "/faq");
  const faqRaw = tSeo.raw("faq");
  const faq = Array.isArray(faqRaw) ? (faqRaw as Array<{ q: string; a: string }>) : [];

  return (
    <div className="relative z-[1] min-h-screen">
      <ContentHeader locale={locale} />
      <main className="site-shell px-4 py-10 text-ink sm:py-16">
        <PageBreadcrumb
          items={[
            { href: "/", label: t("breadcrumbHome") },
            { label: t("title") },
          ]}
        />
        <h1 className="page-title">{t("title")}</h1>
        <div className="mt-8">
          {faq.map((item) => (
            <section key={item.q} className="faq-card">
              <h2>{item.q}</h2>
              <p className="faq-a">{item.a}</p>
            </section>
          ))}
        </div>
        <div className="mt-12">
          <SiteFooter locale={locale} current="faq" />
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
        {faq.length > 0 ? (
          <JsonLd
            data={faqPageJsonLd(faq.map((it) => ({ question: it.q, answer: it.a })))}
          />
        ) : null}
      </main>
    </div>
  );
}
