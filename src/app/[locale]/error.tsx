"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * 路由级错误边界（[locale] 子树）。
 * 捕获 page/组件渲染抛出的异常，提供「重试」与「刷新页面」恢复路径，
 * 取代 Next 默认英文错误页。渲染在 [locale]/layout 的 NextIntlClientProvider 内，
 * 故可直接用 useTranslations。
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  useEffect(() => {
    // 便于排查：把错误与稳定 digest 输出到控制台（生产构建仍保留 console.error）
    // eslint-disable-next-line no-console
    console.error("[WorldTime] render error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <div className="text-4xl" aria-hidden>
        ⚠️
      </div>
      <h1 className="text-lg font-bold text-ink">{t("title")}</h1>
      <p className="text-sm text-muted">{t("description")}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => reset()} className="btn btn-primary btn-sm">
          {t("retry")}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-ghost btn-sm"
        >
          {t("reload")}
        </button>
      </div>
      {error.digest ? (
        <p className="mt-2 break-all font-mono text-[11px] text-faint">{error.digest}</p>
      ) : null}
    </main>
  );
}
