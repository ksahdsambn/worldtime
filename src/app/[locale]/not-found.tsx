import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StateSurface } from "@/components/StateSurface";

/**
 * 本地化 404（[locale] 子树）。
 * 覆盖 time-converter / event 页面调用 notFound() 与未匹配嵌套路由的情况，
 * 取代 Next 默认英文 404 页。request locale 由 [locale]/layout 的
 * setRequestLocale 提供，故 getTranslations() 无需显式传 locale。
 */
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <StateSurface icon={<span>🧭</span>} title={t("title")} description={t("description")}>
      <Link href="/" className="btn btn-primary btn-sm">
        {t("home")}
      </Link>
    </StateSurface>
  );
}
