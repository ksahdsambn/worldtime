"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { subscribe, dismiss, type ToastItem } from "@/lib/toast";
import { usePresence } from "@/lib/usePresence";
import { IconClose } from "./icons";

/**
 * Toast 渲染器（挂载一次即可，见 ThemeRegistry）。
 * - 底部居中、避免遮挡底部浮栏（safe-area）；
 * - error 用 role="alert"，其余 role="status"；
 * - 进/出场过渡：进场从右滑入；消失时（自动到期或 × 关闭）先把条目标记为
 *   leaving，ToastCard 播完退出再卸载，避免硬切。
 *
 * 由于 toast 库（toast.ts）在到期时同步从列表移除条目，组件层另维护一份
 * entries（含 leaving 标记），令同一条 toast 在「当前→退出」间保持同一 React
 * 实例，usePresence 才能正确播放退场。
 */
type Entry = { item: ToastItem; leaving: boolean };

export default function Toaster() {
  const tCom = useTranslations("Common");
  const [items, setItems] = useState<ToastItem[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => subscribe(setItems), []);

  // 同步订阅列表 → entries：新增的追加、消失的置 leaving（保留实例以播退出）
  useEffect(() => {
    setEntries((prev) => {
      const curIds = new Set(items.map((i) => i.id));
      // 消失的翻为 leaving；已 leaving 的保持
      const next = prev.map((e) =>
        curIds.has(e.item.id) ? { item: e.item, leaving: false } : { ...e, leaving: true },
      );
      // 追加新出现的
      for (const it of items) {
        if (!next.some((e) => e.item.id === it.id)) {
          next.push({ item: it, leaving: false });
        }
      }
      return next;
    });
  }, [items]);

  const onExited = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.item.id !== id));
  }, []);

  if (entries.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-3 safe-bottom"
      aria-live="polite"
    >
      {entries.map((e) => (
        <ToastCard key={e.item.id} item={e.item} leaving={e.leaving} onExited={onExited} closeLabel={tCom("close")} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  leaving,
  onExited,
  closeLabel,
}: {
  item: ToastItem;
  leaving: boolean;
  onExited: (id: number) => void;
  closeLabel: string;
}) {
  const { mounted, state } = usePresence(!leaving, 200);

  // 退场动画播完（mounted 翻 false）后通知父组件真正移除
  useEffect(() => {
    if (!mounted) onExited(item.id);
  }, [mounted, onExited, item.id]);

  if (!mounted) return null;

  return (
    <div
      data-state={state}
      role={item.kind === "error" ? "alert" : "status"}
      className="motion-toast pointer-events-auto flex max-w-sm items-start gap-2 rounded-md px-3 py-2 text-sm shadow-lg"
      style={{
        backgroundColor:
          item.kind === "error"
            ? "var(--danger)"
            : item.kind === "success"
              ? "var(--success)"
              : "var(--surface)",
        color:
          item.kind === "error"
            ? "var(--danger-fg)"
            : item.kind === "success"
              ? "var(--success-fg)"
              : "var(--text)",
        border: item.kind === "info" ? "1px solid var(--border)" : "1px solid transparent",
      }}
    >
      <span className="flex-1 break-words">{item.message}</span>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className="shrink-0 opacity-70 hover:opacity-100"
        aria-label={closeLabel}
      >
        <IconClose className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
