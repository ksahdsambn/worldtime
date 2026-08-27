import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type FooterCurrent = "about" | "faq" | "privacy" | "terms";

const linkClass =
  "text-muted underline underline-offset-2 transition-colors duration-150 hover:text-accent";

export default async function SiteFooter({
  locale,
  current,
}: {
  locale: string;
  current?: FooterCurrent;
}) {
  const t = await getTranslations({ locale, namespace: "Seo" });
  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-sm text-muted">
      <nav
        aria-label="Site"
        className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5"
      >
        <Link
          href="/about"
          className={linkClass}
          aria-current={current === "about" ? "page" : undefined}
        >
          {t("aboutLink")}
        </Link>
        <Link
          href="/faq"
          className={linkClass}
          aria-current={current === "faq" ? "page" : undefined}
        >
          {t("faqLink")}
        </Link>
        <Link
          href="/privacy"
          className={linkClass}
          aria-current={current === "privacy" ? "page" : undefined}
        >
          {t("privacyLink")}
        </Link>
        <Link
          href="/terms"
          className={linkClass}
          aria-current={current === "terms" ? "page" : undefined}
        >
          {t("termsLink")}
        </Link>
      </nav>
      <span>{t("sourceNote")}</span>
    </div>
  );
}
