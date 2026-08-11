import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import EventWidget from "@/components/EventWidget";

type Props = { params: { locale: string } };

/**
 * 事件小组件（第七章 6.2）—— 展示某事件在多时区的对应时间，可嵌入。
 * 查询参数：code（base64 状态，与公开事件页同）
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Widget" });
  return { title: t("eventTitle") };
}

export default function EventWidgetPage({ params }: Props) {
  setRequestLocale(params.locale);
  return <EventWidget locale={params.locale} />;
}
