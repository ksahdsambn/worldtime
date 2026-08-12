import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import EventView from "@/components/EventView";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildAlternates, buildOpenGraph } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

/**
 * 服务端校验事件码格式（base64url，无 padding）。
 * 正常生成的链接均由 encodeEventCode 产出，字符集为 [A-Za-z0-9_-]。
 * 明显非法（空 / 含非法字符 / 超长）直接 notFound()，走本地化 404，
 * 既与 time-converter 页一致，也避免畸形码进入客户端解码与渲染。
 */
function isValidEventCode(code: string): boolean {
  if (!code || code.length > 8000) return false;
  return /^[A-Za-z0-9_-]+$/.test(code);
}

/**
 * 公开事件页（MS-5）。
 * code 为 base64 编码的状态（地点 + 选区），由 EventView 在客户端解析展示。
 * 该页面可被分享，访问者看到事件在各地时区的对应时间。
 *
 * SEO：URL 由 base64 状态构成，无稳定 canonical、抓取面无限，故 noindex
 * （robots.ts 同步禁止 /event/）。仍输出同 code 的全语言 alternates，
 * 便于被分享后搜索引擎识别语言版本。
 */
export default async function EventPage({ params }: Props) {
  const { locale: localeRaw, code } = await params;
  setRequestLocale(localeRaw);
  const locale = routing.locales.includes(localeRaw as AppLocale)
    ? (localeRaw as AppLocale)
    : routing.defaultLocale;
  if (!isValidEventCode(code)) {
    notFound();
  }
  return <EventView code={code} locale={locale} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "Event" });
  const path = `/event/${code}`;
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: buildAlternates(locale, path),
    openGraph: buildOpenGraph(locale, { title, description, path }),
  };
}
