import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import ThemeRegistry from "@/components/ThemeRegistry";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "App" });
  return {
    title: t("title"),
    description: t("tagline"),
  };
}

export default function LocaleLayout({ children, params }: Props) {
  const { locale } = params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // 启用静态渲染；须在任何 next-intl 调用前执行
  setRequestLocale(locale);

  return (
    <NextIntlClientProvider locale={locale}>
      <html lang={locale} suppressHydrationWarning>
        <body>
          <ThemeRegistry>
            <ServiceWorkerRegister />
            {children}
          </ThemeRegistry>
        </body>
      </html>
    </NextIntlClientProvider>
  );
}
