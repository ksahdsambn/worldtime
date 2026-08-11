"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  function onChange(next: AppLocale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span>{t("label")}:</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value as AppLocale)}
        className="border rounded px-2 py-1 bg-white text-black"
        aria-label={t("label")}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  );
}
