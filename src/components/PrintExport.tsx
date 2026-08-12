"use client";

import { useTranslations } from "next-intl";
import { toPng } from "html-to-image";

/**
 * 打印与导出图片（6.9）。
 * - 打印：调用 window.print，配合打印样式
 * - 导出图片：将主网格区域转为 PNG 下载
 */
export default function PrintExport() {
  const t = useTranslations("PrintExport");

  function onPrint() {
    window.print();
  }

  async function onExportImage() {
    const target = document.querySelector("main") as HTMLElement | null;
    if (!target) return;
    try {
      const dataUrl = await toPng(target, { backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "worldtime-grid.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // 导出失败时忽略
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs no-print">
      <button
        type="button"
        onClick={onPrint}
        data-testid="btn-print"
        className="btn-ghost btn-sm"
      >
        🖨️ {t("print")}
      </button>
      <button
        type="button"
        onClick={onExportImage}
        data-testid="btn-export-image"
        className="btn-ghost btn-sm"
      >
        🖼️ {t("image")}
      </button>
    </div>
  );
}
