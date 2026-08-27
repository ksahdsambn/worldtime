"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import type { ViewMode } from "@/store/useWorldTimeStore";
import { localStarterCities, financeStarterCities } from "@/data/starterSets";
import { localCityName } from "@/lib/cityName";
import type { CityRecord } from "@/lib/types";
import type { AppLocale } from "@/i18n/routing";
import { IconClock, IconGrid } from "./icons";

/**
 * 首用/空状态门面（第三期：任务卡片入口）。
 *
 * 两个层次并存、各司其职：
 * - 任务卡片区（门面）：把「能做什么」翻译成任务——点卡片选定任务，随即
 *   高亮顶部城市搜索引导添加城市；添加第一个城市后自动进入所选模式
 *   （store.addPlace 消费 pendingMode，见 useWorldTimeStore）。
 * - 快捷开始按钮：最快补城市（本地时区起步 / 预设城市组）。未选任务而
 *   直接点快捷按钮时维持现状进入默认时钟模式。
 *
 * 无障碍：卡片为原生 button（键盘可聚焦、回车触发、焦点可见）；选定态由
 * aria-pressed 表达（样式同步）；卡片标题由 h3 包裹 button 进文档大纲
 * （h1 品牌 → h2 空状态 → h3 任务卡片），读屏在标题列表可直达任务，
 * 按钮 accessible name 朗读完整任务信息。
 * 卡片为不透明表面（surface + border 令牌，无玻璃——内容性表面）。
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

  // 金融预设的 chip 文本：城市名随页面 locale（SSR 与客户端同构，无水合风险）
  const financeChips = financeStarterCities()
    .map((c) => `${c.flag} ${localCityName(locale, c)}`)
    .join("　·　");

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
    <div className="relative flex min-h-[380px] flex-col items-center justify-center px-6 py-14">
      <div className="animate-scale-in relative w-full max-w-2xl space-y-8 text-center">
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

        {/* 任务卡片区：选任务 → 高亮搜索 → 加首城自动进模式。
            卡片标题用 h3（页面大纲 h1→h2→h3 层级合理）；h3 包裹原生 button
            （button 内容模型允许 phrasing content，h3 亦为 phrasing，合法）；
            读屏在标题列表可直达任务，按钮 accessible name 仍朗读完整任务信息。 */}
        <div className="grid gap-3 text-left sm:grid-cols-2">
          {tasks.map((task) => (
            <h3 key={task.mode} className="min-w-0">
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
        </div>

        {/* 快捷开始：最快补城市（与任务卡片并存，职责分离） */}
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
