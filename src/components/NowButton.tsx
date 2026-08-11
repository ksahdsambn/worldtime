"use client";

import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";

/**
 * "回到现在"按钮（TC-5）。
 * 点击后：
 * - 把视图起始日重置为今天（viewStartDate=null），保证"现在"落在当前 7 天窗口内；
 * - 找到包含当前时刻的网格单元格并滚动到视口中部。
 *
 * 注意：setViewStartDate 是异步重渲染触发器，同步查 DOM 会读到旧 cells。
 * 故把滚动放进 requestAnimationFrame，在 React 重渲染、DOM 更新后再读取，
 * 确保从远处日期跳回时目标格确实在当前窗口内。
 */
export default function NowButton() {
  const t = useTranslations("Now");
  const setViewStartDate = useWorldTimeStore((s) => s.setViewStartDate);

  function backToNow() {
    // 先重置视图起始日，确保当前时刻在渲染窗口内
    setViewStartDate(null);
    // 等待 React 重渲染后再读 DOM（避免读到旧窗口的 cells）
    requestAnimationFrame(() => {
      const now = Date.now();
      // 找到包含当前时刻的单元格（c.ms <= now < c.ms + 1h），
      // 兼容半小时/45 分钟偏移时区（其列 ms 不落在 UTC 整点上）。
      const cells = Array.from(
        document.querySelectorAll<HTMLTableCellElement>("td[data-ms]"),
      );
      const target =
        cells.find((c) => {
          const ms = Number(c.getAttribute("data-ms"));
          return ms <= now && now < ms + 3600_000;
        }) ?? cells[0];
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={backToNow}
      data-testid="now-button"
      className="rounded border bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
    >
      {t("backToNow")}
    </button>
  );
}
