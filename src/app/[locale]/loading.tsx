import { getTranslations } from "next-intl/server";

/**
 * 路由切换加载态（骨架屏）。
 * 在 [locale] 段导航时短暂显示，避免空白闪烁；label 供读屏播报。
 */
export default async function Loading() {
  const t = await getTranslations("Loading");
  return (
    <main
      className="flex min-h-[40vh] items-center justify-center p-8"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="text-sm text-muted">
        <span
          className="shimmer mr-2 inline-block h-3 w-8 rounded-full bg-surface-hover align-middle"
          aria-hidden
        />
        {t("label")}
      </span>
    </main>
  );
}
