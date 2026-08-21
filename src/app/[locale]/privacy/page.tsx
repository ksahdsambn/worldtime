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
  const paragraphs = t.raw("paragraphs") as string[];

  return (
    <div className="liquid-glass-backdrop min-h-screen">
      <ContentHeader locale={locale} />
      <main className="mx-auto max-w-2xl px-4 py-10 text-ink sm:py-16">
        <PageBreadcrumb
          items={[
            { href: "/", label: t("breadcrumbHome") },
            { label: t("title") },
          ]}
        />
        <h1 className="text-2xl font-bold tracking-tight sm:text-[32px]">{t("title")}</h1>
        <div className="mt-6 space-y-4 leading-relaxed text-muted">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-12">
          <SiteFooter locale={locale} />
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
