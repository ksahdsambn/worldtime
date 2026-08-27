"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { IconDrag } from "./icons";

/** 一次性拖选提示的记忆键（独立于 worldtime:v1 主状态，不参与持久化迁移）。 */
const HINT_KEY = "worldtime:drag-hint:v1";

/**
 * 一次性拖选提示（第四期）：新用户首次进入排期视图时出现轻量提示，
 * 说明「在网格上横向拖动即可框选时间段」。
 *
 * 「读过即不再出现」的两条路径：
 * - 主动关闭（点「知道了」按钮）→ 写入 localStorage；
 * - 首次拖出选区（selection 非 null，说明用户已经会用）→ 同样写入。
 * 记忆存于本地（localStorage），此后任何语言/主题下都不再出现。
 *
 * SSR 安全：初始不渲染（dismissed=true），挂载后检查 localStorage 再现身，
 * 避免服务端与客户端水合不一致。
 */
export default function DragHint() {
  const t = useTranslations("Grid");
  const selection = useWorldTimeStore((s) => s.selection);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(HINT_KEY)) setDismissed(false);
    } catch {
      // 隐私模式等读取失败：视为已读，不打扰
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      // 写入失败忽略（本次会话内也已隐藏）
    }
  }

  // 读过后不再出现：用户首次拖出选区即视为已掌握，静默收起
  useEffect(() => {
    if (!dismissed && selection != null) dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  if (dismissed) return null;

  return (
    <div
      role="note"
      data-testid="drag-hint"
      className="mx-3 mb-2 flex items-center gap-2.5 rounded-md border border-line bg-surface-inset px-3 py-2 md:mx-4"
    >
      <IconDrag className="h-4 w-4 shrink-0 text-accent" aria-hidden />
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted">
        {t("dragHint")}
      </p>
      <button
        type="button"
        onClick={dismiss}
        data-testid="drag-hint-dismiss"
        className="btn btn-ghost btn-sm shrink-0"
      >
        {t("dragHintDone")}
      </button>
    </div>
  );
}
