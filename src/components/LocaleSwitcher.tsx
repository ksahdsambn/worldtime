"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, LOCALE_NAMES, type AppLocale } from "@/i18n/routing";

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
    <label className="inline-flex items-center gap-1.5">
      <span className="hidden text-[11px] text-faint sm:inline">{t("label")}</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value as AppLocale)}
        className="input !w-auto !px-1.5 !py-1 text-xs"
        aria-label={t("label")}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
