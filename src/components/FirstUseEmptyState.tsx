"use client";

import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { localStarterCities, financeStarterCities } from "@/data/starterSets";
import type { CityRecord } from "@/lib/types";

/**
 * 首次使用富空状态：替代旧的一行 `Grid.empty` 文案。
 *
 * - 温暖主标题 + 一行价值说明；
 * - 一键起始预设（本地时区 / 世界金融时钟），点一下即填入城市——网格 / 热力图 /
 *   拖拽选区全部立刻可用，这是到「aha」的最短路径；
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
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-12">
      <div className="animate-fade-up w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <div className="text-3xl leading-none" aria-hidden>
            🌐
          </div>
          <h2 className="text-lg font-semibold text-ink">{t("emptyHeadline")}</h2>
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

        <p className="pt-1 text-xs text-faint">{t("searchHint")}</p>
      </div>
    </div>
  );
}
