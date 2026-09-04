import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function PageBreadcrumb({
  locale,
  items,
}: {
  locale: string;
  items: Array<{ href?: string; label: string }>;
}) {
  const t = await getTranslations({ locale, namespace: "A11y" });
  return (
    <nav aria-label={t("breadcrumb")} className="mb-5 text-[12px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden className="text-faint">/</span> : null}
            {it.href ? (
              <Link href={it.href} className="hover:text-accent">
                {it.label}
              </Link>
            ) : (
              <span className="text-ink" aria-current="page">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
