"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toPng } from "html-to-image";
import { toast } from "@/lib/toast";
import { IconPrinter, IconImage } from "./icons";

/**
 * 打印与导出图片（6.9）。
 * - 打印：调用 window.print，配合打印样式
 * - 导出图片：将主网格区域转为 PNG 下载
 *
 * 健壮性加固：
 * - 导出图片为耗时异步操作，加 loading 态（禁用按钮 + spinner）与 in-flight 防连点；
 * - toPng 超时（大网格 / CORS 污染 / OOM 可能久挂）；
 * - 失败时不再静默吞掉，给 toast 反馈；成功也给 toast 确认。
 */
export default function PrintExport() {
  const t = useTranslations("PrintExport");
  const tExp = useTranslations("Export");
  const [exporting, setExporting] = useState(false);
  // in-flight 守卫：ref 同步可读，避免连点在 setState 异步窗口内重复触发。
  const inFlightRef = useRef(false);

  function onPrint() {
    window.print();
  }

  async function onExportImage() {
    if (inFlightRef.current) return;
    const target = document.querySelector("main") as HTMLElement | null;
    if (!target) {
      toast.error(t("noTarget"));
      return;
    }
    inFlightRef.current = true;
    setExporting(true);
    try {
      // toPng 可能久挂（超大 DOM / 跨域图片污染画布）：12s 超时。
      // 手动控制 timer：成功 / 失败都 clearTimeout，避免 race 的「输家」
      // 在已结算后再 reject 造成未处理的 Promise 拒绝。
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("export timeout")),
          12_000,
        );
        toPng(target, { backgroundColor: "#ffffff" }).then(
          (url) => {
            clearTimeout(timer);
            resolve(url);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
        );
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "worldtime-grid.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(tExp("copied"));
    } catch {
      // CORS 污染画布 / 内存不足 / 超时等：明确反馈，而非静默失败
      toast.error(t("exportFailed"));
    } finally {
      inFlightRef.current = false;
      setExporting(false);
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
        <IconPrinter className="h-3.5 w-3.5" />
        {t("print")}
      </button>
      <button
        type="button"
        onClick={onExportImage}
        disabled={exporting}
        data-testid="btn-export-image"
        className="btn-ghost btn-sm"
        aria-busy={exporting || undefined}
      >
        {exporting ? (
          <>
            <span
              className="inline-block h-3 w-3 animate-pulse rounded-full bg-accent"
              aria-hidden
            />
            {t("exporting")}
          </>
        ) : (
          <>
            <IconImage className="h-3.5 w-3.5" />
            {t("image")}
          </>
        )}
      </button>
    </div>
  );
}
