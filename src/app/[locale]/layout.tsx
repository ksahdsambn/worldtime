import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import ThemeRegistry from "@/components/ThemeRegistry";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import GisScript from "@/components/GisScript";
import AtmosphereBackground from "@/components/AtmosphereBackground";
import { getSiteUrl, buildAlternates, buildOpenGraph } from "@/lib/seo";
import "../globals.css";

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * 视口配置（Next 15 起 themeColor 须从 metadata 迁出到 viewport 导出）。
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover：让 env(safe-area-inset-*) 在 notched / 全面屏生效，
  // 配合 .safe-top / .safe-bottom 避免 sticky 顶栏与底部浮栏被遮挡。
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f8" },
    { media: "(prefers-color-scheme: dark)", color: "#070b14" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "App" });
  const brand = t("title");
  // 首页 <title> 用关键词丰富的标题（第 14 轮 SEO）；
  // 可见 <h1> 仍是品牌名 brand，品牌后缀模板也仍用 brand。
  const homeTitle = t("homeTitle");
  const description = t("homeDescription");
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: homeTitle,
      // 子路由仅声明页面名，品牌后缀由模板统一追加，避免重复
      template: `%s | ${brand}`,
    },
    description,
    applicationName: brand,
    // 首页 canonical/hreflang；子页面各自覆盖
    alternates: buildAlternates(locale, ""),
    openGraph: buildOpenGraph(locale, {
      title: homeTitle,
      description,
      path: "",
      type: "website",
    }),
    twitter: { card: "summary_large_image" },
    manifest: "/manifest.webmanifest",
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // 启用静态渲染；须在任何 next-intl 调用前执行
  setRequestLocale(locale);

  return (
    <NextIntlClientProvider locale={locale}>
      <html lang={locale} className={sora.variable} suppressHydrationWarning>
        <body>
          <ThemeRegistry>
            <AtmosphereBackground />
            <ServiceWorkerRegister />
            <GisScript />
            {children}
          </ThemeRegistry>
        </body>
      </html>
    </NextIntlClientProvider>
  );
}
