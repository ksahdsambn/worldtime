"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { localStarterCities, financeStarterCities } from "@/data/starterSets";
import { localCityName } from "@/lib/cityName";
import type { CityRecord } from "@/lib/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * 首次使用富空状态：替代旧的一行 `Grid.empty` 文案。
 *
 * 减法重构：只保留品牌印记 + 一句 headline + 两个自解释入口——
 * 「从我的时区开始」与「国旗 chip 组」（🇺🇸 纽约 · 🇬🇧 伦敦 · 🇯🇵 东京，
 * 城市名随 locale 本地化，视觉自解释，零说明文字）。
 *
 * addPlace 会自动把加入的首座城市设为主地点（home），因此预设顺序即「主地点在前」。
 */
export default function FirstUseEmptyState() {
  const t = useTranslations("Onboarding");
  const locale = useLocale() as AppLocale;
  const addPlace = useWorldTimeStore((s) => s.addPlace);

  function apply(cities: CityRecord[]) {
    for (const c of cities) addPlace(c);
  }

  // 金融预设的 chip 文本：城市名随页面 locale（SSR 与客户端同构，无水合风险）
  const financeChips = financeStarterCities()
    .map((c) => `${c.flag} ${localCityName(locale, c)}`)
    .join("　·　");

  return (
    <div className="relative flex min-h-[380px] flex-col items-center justify-center px-6 py-14">
      <div className="animate-scale-in relative w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <span className="brand-orbit mx-auto">
            <Image
              src="/brand/worldtime-mark.svg"
              alt=""
              width={48}
              height={48}
              unoptimized
              className="brand-mark"
              aria-hidden
            />
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {t("emptyHeadline")}
          </h2>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => apply(localStarterCities())}
            className="btn btn-primary w-full"
          >
            {t("startLocal")}
          </button>

          <button
            type="button"
            onClick={() => apply(financeStarterCities())}
            aria-label={t("presetFinance")}
            data-testid="preset-finance"
            className="btn btn-ghost w-full tracking-wide text-ink"
          >
            {financeChips}
          </button>
        </div>
      </div>
    </div>
  );
}
