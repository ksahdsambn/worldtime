import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import WorldClockWidget from "@/components/WorldClockWidget";

type Props = { params: Promise<{ locale: string }> };

/**
 * 世界时钟小组件（第七章 6.1）—— 可嵌入博客/官网的独立路由。
 * 查询参数：cities=cn-beijing,us-new-york & theme=light|dark & hours=12|24
 *
 * SEO：嵌入用小组件页，noindex 以避免与主站争抢排名（关键词蚕食）；
 * robots.txt 同步禁止 /widget/。
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Widget" });
  return {
    title: { absolute: t("worldClockTitle") },
    robots: { index: false, follow: false },
  };
}

export default async function WorldClockWidgetPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WorldClockWidget />;
}
