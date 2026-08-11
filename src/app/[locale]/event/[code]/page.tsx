import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import EventView from "@/components/EventView";
import { routing, type AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

/**
 * 公开事件页（MS-5）。
 * code 为 base64 编码的状态（地点 + 选区），由 EventView 在客户端解析展示。
 * 该页面可被分享，访问者看到事件在各地时区的对应时间。
 */
export default async function EventPage({ params }: Props) {
  const { locale: localeRaw, code } = await params;
  setRequestLocale(localeRaw);
  const locale = routing.locales.includes(localeRaw as AppLocale)
    ? (localeRaw as AppLocale)
    : routing.defaultLocale;
  return <EventView code={code} locale={locale} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Event" });
  return { title: t("title"), description: t("description") };
}
