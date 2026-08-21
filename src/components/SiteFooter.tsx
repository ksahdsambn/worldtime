import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Seo" });
  return (
    <nav className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-sm text-muted">
      <Link href="/about" className="text-accent underline underline-offset-2 hover:text-accent-hover">
        {t("aboutLink")}
      </Link>
      <Link href="/privacy" className="text-accent underline underline-offset-2 hover:text-accent-hover">
        {t("privacyLink")}
      </Link>
      <span>{t("sourceNote")}</span>
    </nav>
  );
}
