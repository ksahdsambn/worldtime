import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DateTime } from "luxon";
import { formatOffset } from "@/lib/time";
import { parseSlug } from "@/lib/landingSlug";
import { routing } from "@/i18n/routing";
import { JsonLd } from "@/components/JsonLd";
import {
  POPULAR_CITY_PAIRS,
  POPULAR_TZ_PAIRS,
  buildAlternates,
  buildOpenGraph,
  webAppJsonLd,
  localeUrl,
} from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/**
 * SEO 着陆页（第五章 LP-1~5）。
 *
 * slug 采用「--」（双连字符）作为两段分隔符，避免与城市 id 内的
 * 单连字符（如 cn-hohhot-east）冲突。形如：
 * - 城市对："cn-beijing--us-new-york"
 * - 时区缩写对："EST--PST"
 *
 * 兼容：旧式以单连字符拼接的缩写对（如 "EST-PST"）仍可解析，
 * 因为时区缩写不含连字符。
 *
 * 渲染策略：构建期静态生成（generateStaticParams 枚举热门组合），
 * 其余长尾组合按需生成（ISR，dynamicParams 默认允许）。
 * 服务端返回的原始 HTML 即含完整时差与对照表内容。
 *
 * SEO：每页输出 canonical + 全语言 hreflang（含 x-default），用同名 slug
 * 把 11 语言版本收束到同一组对照页，避免重复内容惩罚。
 */

export function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  // 遍历所有支持语言（新增语言后自动覆盖，无需手动维护此列表）
  for (const locale of routing.locales) {
    // 城市对（以「--」分隔）
    for (const [a, b] of POPULAR_CITY_PAIRS) {
      params.push({ locale, slug: `${a}--${b}` });
    }
    // 时区缩写对（以「--」分隔）
    for (const [a, b] of POPULAR_TZ_PAIRS) {
      params.push({ locale, slug: `${a}--${b}` });
    }
  }
  return params;
}

// 允许长尾组合按需生成（ISR）
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  const info = parseSlug(slug);
  const path = `/time-converter/${slug}`;
  if (!info) {
    return {
      title: t("title"),
      description: t("description"),
      alternates: buildAlternates(locale, path),
      openGraph: buildOpenGraph(locale, {
        title: t("title"),
        description: t("description"),
        path,
      }),
    };
  }
  // title 仅声明页面名，品牌后缀由 layout template 追加（避免重复品牌）
  const title = `${info.aLabel} ↔ ${info.bLabel} · ${t("title")}`;
  const description = `${info.aLabel} - ${info.bLabel}: ${t("description")}`;
  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: buildOpenGraph(locale, { title, description, path }),
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  // async server component 中不能用 hook，用 getTranslations 替代 useTranslations
  const t = await getTranslations({ locale, namespace: "Landing" });
  const info = parseSlug(slug);
  if (!info) notFound();

  // 服务端"当前"时刻用于对照表（固定采样若干小时）。
  // 该页面配置了 revalidate=3600，now 会随每次按需重新生成而刷新，
  // 此处同时记录"生成时刻"供页面展示（避免误以为是实时数据）。
  const now = Date.now();
  const updatedAt = DateTime.fromMillis(now, { zone: "utc" }).toFormat(
    "yyyy-MM-dd HH:mm 'UTC'",
  );
  // diffMinutes 基于"当前"单一时刻；DST 切换日各小时偏移可能不同，
  // 此处仅作顶部概览展示，对照表逐行用 setZone 精确换算（见下方 rows）。
  const diff = info.diffMinutes;
  const diffLabel = formatOffset(diff);
  // 统一以「B 相对 A」表述：diff>0 表示 B 领先（更晚），diff<0 表示 B 落后（更早）。
  const bAhead = diff >= 0;

  // 典型时段对照表（A 地 0/6/9/12/18/22 点对应 B 地时间）
  const rows = [0, 6, 9, 12, 15, 18, 22].map((h) => {
    const aDt = DateTime.fromMillis(now, { zone: info.aZone }).startOf("day").plus({ hours: h });
    const bDt = aDt.setZone(info.bZone);
    return {
      aHour: aDt.toFormat("HH:mm"),
      bHour: bDt.toFormat("HH:mm"),
      bDay: bDt.toFormat("EEE"),
    };
  });

  const pageTitle = `${info.aLabel} ↔ ${info.bLabel} · ${t("title")}`;

  return (
    <main className="p-6 prose max-w-2xl">
      <h1>
        {info.aLabel} ↔ {info.bLabel}
      </h1>
      <p>
        {info.kind === "city" ? t("cityPair") : t("tzPair")} ·{" "}
        <strong>
          {info.bLabel} {bAhead ? t("isAhead") : t("lags")} {diffLabel} {t("vs")} {info.aLabel}
        </strong>{" "}
        <span className="text-xs text-gray-500">{t("currentOffsetNote")}</span>
      </p>
      <p className="text-sm text-gray-600">
        {t("bNote", { b: info.bLabel, a: info.aLabel, dir: t(bAhead ? "aheadNote" : "behindNote") })}
      </p>

      <h2>{t("timeComparison")}</h2>
      <p className="text-xs text-gray-500 mb-1">{t("comparisonNote")}</p>
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="border px-2 py-1">{info.aLabel}</th>
            <th className="border px-2 py-1">{info.bLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border px-2 py-1 tabular-nums">{r.aHour}</td>
              <td className="border px-2 py-1 tabular-nums">
                {r.bHour} <span className="text-gray-500">({r.bDay})</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-400">{t("updatedAt", { time: updatedAt })}</p>

      {info.kind === "tz" && (
        <p className="text-sm text-gray-600">
          {info.aLabel} = {info.aName} ({info.aZone}); {info.bLabel} = {info.bName} ({info.bZone}).
        </p>
      )}

      <JsonLd
        data={webAppJsonLd({
          name: pageTitle,
          url: localeUrl(locale, `/time-converter/${slug}`),
          description: `${info.aLabel} - ${info.bLabel}: ${t("description")}`,
        })}
      />
    </main>
  );
}
