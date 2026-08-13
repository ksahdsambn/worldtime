"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { localStarterCities, financeStarterCities } from "@/data/starterSets";
import type { CityRecord } from "@/lib/types";

/**
 * 首次使用富空状态：替代旧的一行 `Grid.empty` 文案。
 *
 * - 温暖主标题 + 一行价值说明；
 * - 一键起始预设（本地时区 / 世界金融时钟），点一下即填入城市；
 * - 指向搜索框的轻提示，承接想自己挑城市的用户。
 *
 * addPlace 会自动把加入的首座城市设为主地点（home），因此预设顺序即「主地点在前」。
 */
export default function FirstUseEmptyState() {
  const t = useTranslations("Onboarding");
  const addPlace = useWorldTimeStore((s) => s.addPlace);

  function apply(cities: CityRecord[]) {
    for (const c of cities) addPlace(c);
  }

  return (
    <div className="relative flex min-h-[380px] flex-col items-center justify-center px-6 py-14">
      <div className="animate-scale-in relative w-full max-w-md space-y-7 text-center">
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
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
            {t("emptyBody")}
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => apply(localStarterCities())}
            className="btn btn-primary w-full"
          >
            {t("startLocal")}
          </button>
          <p className="text-xs text-faint">{t("startLocalHint")}</p>

          <button
            type="button"
            onClick={() => apply(financeStarterCities())}
            className="btn btn-ghost w-full"
          >
            {t("presetFinance")}
          </button>
          <p className="text-xs text-faint">{t("presetFinanceHint")}</p>
        </div>

        <p className="pt-1 text-xs tracking-wide text-faint">{t("searchHint")}</p>
      </div>
    </div>
  );
}
