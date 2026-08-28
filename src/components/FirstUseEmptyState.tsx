"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import type { ViewMode } from "@/store/useWorldTimeStore";
import { localStarterCities, financeStarterCities } from "@/data/starterSets";
import { localCityName } from "@/lib/cityName";
import type { CityRecord } from "@/lib/types";
import type { AppLocale } from "@/i18n/routing";
import { IconClock, IconGrid, IconHome, IconGlobe } from "./icons";

/**
 * 首用空状态：四张任务/快捷卡。
 *
 * pendingMode 写入 store，addPlace 消费后进入所选视图。
 * 标题必须是 h3>button：卡片进文档大纲，同时保留原生键盘操作。
 */
export default function FirstUseEmptyState() {
  const t = useTranslations("Onboarding");
  const locale = useLocale() as AppLocale;
  const addPlace = useWorldTimeStore((s) => s.addPlace);
  const pendingMode = useWorldTimeStore((s) => s.pendingMode);
  const setPendingMode = useWorldTimeStore((s) => s.setPendingMode);
  const pulseSearch = useWorldTimeStore((s) => s.pulseSearch);

  function apply(cities: CityRecord[]) {
    for (const c of cities) addPlace(c);
  }

  function chooseTask(mode: ViewMode) {
    setPendingMode(mode);
    // 引导：高亮并聚焦顶部城市搜索
    pulseSearch();
  }

  // 金融预设的 chips：城市名随页面 locale（SSR 与客户端同构，无水合风险）。
  // 国旗 emoji 对读屏是噪音（逐个朗读"国旗"），以 aria-hidden 只暴露城市名。
  const financeCities = financeStarterCities();

  const tasks: Array<{
    mode: ViewMode;
    testId: string;
    icon: React.ReactNode;
    title: string;
    body: string;
  }> = [
    {
      mode: "clock",
      testId: "task-card-clock",
      icon: <IconClock className="h-5 w-5" />,
      title: t("taskClockTitle"),
      body: t("taskClockBody"),
    },
    {
      mode: "overlap",
      testId: "task-card-overlap",
      icon: <IconGrid className="h-5 w-5" />,
      title: t("taskOverlapTitle"),
      body: t("taskOverlapBody"),
    },
  ];

  return (
    <div className="site-shell relative flex flex-1 flex-col px-4 py-4 md:py-5">
      <div className="animate-scale-in relative flex w-full flex-1 flex-col gap-4 text-center">
        <div className="shrink-0 space-y-2">
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

        {/* 四卡单列：h3 包裹原生 button 进大纲；任务卡 aria-pressed 选定态。 */}
        <div className="task-card-stack">
          {tasks.map((task) => (
            <h3 key={task.mode}>
              <button
                type="button"
                aria-pressed={pendingMode === task.mode}
                onClick={() => chooseTask(task.mode)}
                data-testid={task.testId}
                className="task-card w-full"
              >
                <span className="task-card__icon" aria-hidden>
                  {task.icon}
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block text-[15px] font-semibold leading-snug text-ink">
                    {task.title}
                  </span>
                  <span className="block text-[13px] leading-relaxed text-muted">
                    {task.body}
                  </span>
                </span>
              </button>
            </h3>
          ))}

          <h3>
            <button
              type="button"
              onClick={() => apply(localStarterCities())}
              data-testid="quick-start-local"
              className="task-card w-full"
            >
              <span className="task-card__icon task-card__icon--solid" aria-hidden>
                <IconHome className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-[15px] font-semibold leading-snug text-ink">
                  {t("startLocal")}
                </span>
                <span className="block text-[13px] leading-relaxed text-muted">
                  {t("startLocalBody")}
                </span>
              </span>
            </button>
          </h3>

          <h3>
            <button
              type="button"
              onClick={() => apply(financeStarterCities())}
              data-testid="preset-finance"
              className="task-card w-full"
            >
              <span className="task-card__icon" aria-hidden>
                <IconGlobe className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-[15px] font-semibold leading-snug text-ink">
                  {t("presetFinance")}
                </span>
                <span className="block text-[13px] leading-relaxed text-muted">
                  {financeCities.map((c, i) => (
                    <span key={c.id}>
                      <span aria-hidden>{c.flag}</span>{" "}
                      {localCityName(locale, c)}
                      {i < financeCities.length - 1 && (
                        <span aria-hidden>　·　</span>
                      )}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          </h3>
        </div>
      </div>
    </div>
  );
}
