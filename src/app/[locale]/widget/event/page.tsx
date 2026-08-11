import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import EventWidget from "@/components/EventWidget";
import { routing, type AppLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

/**
 * 事件小组件（第七章 6.2）—— 展示某事件在多时区的对应时间，可嵌入。
 * 查询参数：code（base64 状态，与公开事件页同）
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Widget" });
  return { title: t("eventTitle") };
}

export default async function EventWidgetPage({ params }: Props) {
  const { locale: localeRaw } = await params;
  setRequestLocale(localeRaw);
  const locale = routing.locales.includes(localeRaw as AppLocale)
    ? (localeRaw as AppLocale)
    : routing.defaultLocale;
  return <EventWidget locale={locale} />;
}
