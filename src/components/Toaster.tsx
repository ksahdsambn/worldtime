"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { subscribe, dismiss, type ToastItem } from "@/lib/toast";

/**
 * Toast 渲染器（挂载一次即可，见 ThemeRegistry）。
 * - 底部居中、避免遮挡底部浮栏（safe-area）；
 * - error 用 role="alert"，其余 role="status"；
 * - 进/出场动画仅在非 reduced-motion 下生效（CSS 已统一处理）。
 */
export default function Toaster() {
  const tCom = useTranslations("Common");
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribe(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-3 safe-bottom"
      aria-live="polite"
    >
      {items.map((it) => (
        <div
          key={it.id}
          role={it.kind === "error" ? "alert" : "status"}
          className="pointer-events-auto flex max-w-sm items-start gap-2 rounded-md px-3 py-2 text-sm shadow-lg animate-fade-up"
          style={{
            backgroundColor:
              it.kind === "error"
                ? "var(--heat-bad-ink)"
                : it.kind === "success"
                  ? "var(--heat-good-ink)"
                  : "var(--surface)",
            color:
              it.kind === "error" || it.kind === "success"
                ? "#ffffff"
                : "var(--text)",
            border:
              it.kind === "info" ? "1px solid var(--border)" : "1px solid transparent",
          }}
        >
          <span className="flex-1 break-words">{it.message}</span>
          <button
            type="button"
            onClick={() => dismiss(it.id)}
            className="shrink-0 opacity-70 hover:opacity-100"
            aria-label={tCom("close")}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
