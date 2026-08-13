import { getTranslations } from "next-intl/server";

/**
 * 路由切换加载态。
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
      <span className="surface-glass inline-flex items-center gap-3 px-5 py-3 text-sm text-muted">
        <span className="chrono-spinner" aria-hidden>
          <span className="chrono-spinner__ring" />
          <span className="chrono-spinner__ring chrono-spinner__ring--inner" />
          <span className="chrono-spinner__dot" />
        </span>
        {t("label")}
      </span>
    </main>
  );
}
