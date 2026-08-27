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
 * 首用/空状态门面（第三期任务卡片入口；第 56 轮统一为 4 卡等大网格）。
 *
 * 一个网格四张等大卡片，一排一排向下流动：
 * - 第一排（任务卡）：点卡片选定任务，随即高亮顶部城市搜索引导添加城市；
 *   添加第一个城市后自动进入所选模式（store.addPlace 消费 pendingMode，
 *   见 useWorldTimeStore）。
 * - 第二排（快捷开始卡）：最快补城市，点击立即生效——「从我的时区开始」
 *   本地时区起步 /「世界金融时钟」预设城市组；未选任务直接点快捷卡时
 *   进入默认时钟模式。
 *
 * 无障碍：四张卡均为原生 button（键盘可聚焦、回车触发、焦点可见）；
 * 任务卡的选定态由 aria-pressed 表达（样式同步）；卡片标题由 h3 包裹
 * button 进文档大纲（h1 品牌 → h2 空状态 → h3 卡片），读屏在标题列表
 * 可直达任务，按钮 accessible name 朗读完整卡片信息。
 * 卡片为不透明表面（surface + border 令牌，无玻璃——内容性表面）。
 *
 * flex-1：本分支是 Workspace 三态中唯一会短于视口内容的分支，必须撑满
 * 剩余高度（内容垂直居中），否则首页 footer 上浮、撑满视口的容器余量变成
 * footer 下方的死背景区。
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
    <div className="relative flex min-h-[380px] flex-1 flex-col items-center justify-center px-6 py-14">
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

        {/* 四卡等大网格，一排一排向下流动：第一排选任务（aria-pressed 选定态），
            第二排快捷开始（点击立即加城）。卡片标题用 h3（页面大纲
            h1→h2→h3 层级合理）；h3 包裹原生 button（button 内容模型允许
            phrasing content，h3 亦为 phrasing，合法）；读屏在标题列表可直达
            卡片，按钮 accessible name 仍朗读完整卡片信息。快捷卡 sm 起占满
            整行（col-span-2），与任务卡同宽同款、面积一致。 */}
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

          <h3 className="min-w-0 sm:col-span-2">
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

          <h3 className="min-w-0 sm:col-span-2">
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
