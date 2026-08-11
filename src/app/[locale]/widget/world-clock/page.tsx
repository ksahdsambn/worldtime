import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import WorldClockWidget from "@/components/WorldClockWidget";

type Props = { params: Promise<{ locale: string }> };

/**
 * 世界时钟小组件（第七章 6.1）—— 可嵌入博客/官网的独立路由。
 * 查询参数：cities=cn-beijing,us-new-york & theme=light|dark & hours=12|24
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Widget" });
  return { title: t("worldClockTitle") };
}

export default async function WorldClockWidgetPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WorldClockWidget />;
}
