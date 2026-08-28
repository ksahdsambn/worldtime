import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import GlassHeader from "@/components/GlassHeader";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

export default async function ContentHeader({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "App" });
  return (
    <GlassHeader>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:flex-nowrap">
        <Link
          href="/"
          className="flex min-w-0 max-w-[16rem] items-center gap-3 sm:max-w-xs"
        >
          <span className="brand-orbit brand-orbit--sm">
            <Image
              src="/brand/worldtime-mark.svg"
              alt=""
              width={32}
              height={32}
              unoptimized
              priority
              className="brand-mark"
            />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[16px] font-semibold tracking-tight text-gradient">
              {t("title")}
            </span>
            <span
              className="truncate text-[11px] tracking-wide text-muted"
              title={t("tagline")}
            >
              {t("tagline")}
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/" className="btn btn-primary btn-sm">
            {t("openApp")}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </GlassHeader>
  );
}
