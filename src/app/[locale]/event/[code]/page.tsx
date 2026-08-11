import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import EventView from "@/components/EventView";

type Props = {
  params: { locale: string; code: string };
};

/**
 * 公开事件页（MS-5）。
 * code 为 base64 编码的状态（地点 + 选区），由 EventView 在客户端解析展示。
 * 该页面可被分享，访问者看到事件在各地时区的对应时间。
 */
export default function EventPage({ params }: Props) {
  setRequestLocale(params.locale);
  return <EventView code={params.code} locale={params.locale} />;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; code: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Event" });
  return { title: t("title"), description: t("description") };
}
