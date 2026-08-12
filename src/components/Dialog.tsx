"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePresence } from "@/lib/usePresence";

/**
 * 应用内 prompt / confirm 对话框（取代 window.prompt / window.confirm）。
 *
 * 动机：原生 prompt/confirm 在移动浏览器上样式突兀、不可定制，且部分 WebView
 * 体验很差。这里提供一个轻量、令牌化的替代：手机端为底部抽屉式（贴底弹出），
 * 桌面端为居中弹窗；带遮罩、Esc 取消、回车提交、自动聚焦并预选文本。
 *
 * 进出场过渡：遮罩淡入淡出（motion-overlay），面板上滑/淡入（motion-sheet）。
 * 关闭时 Promise 立即 resolve（不阻塞调用方），但通过 usePresence 延迟卸载以
 * 播放退场动画；退场结束后才真正从 DOM 移除并归还焦点。
 *
 * 无障碍：
 * - role="dialog" aria-modal="true"，标题同时用作 aria-label；
 * - 打开时把焦点移入对话框（prompt 聚焦输入框并全选，confirm 聚焦主按钮）；
 * - 关闭时把焦点还原到打开前的触发元素（如点击的按钮），便于键盘/读屏继续操作；
 * - Esc 取消、回车提交（两种模式都包裹在 <form> 里）。
 *
 * 用法：
 *   const { prompt, confirm, dialog } = useDialog(t("cancel"), t("confirm"));
 *   const name = await prompt({ title: "…", defaultValue: "…" });
 *   const ok = await confirm({ title: "…", message: "…", destructive: true });
 *   return (<>{dialog}</>);
 */

type PromptOpts = {
  title: string;
  defaultValue?: string;
  placeholder?: string;
};

type ConfirmOpts = {
  title: string;
  message?: string;
  destructive?: boolean;
};

type Pending = {
  kind: "prompt" | "confirm";
  opts: PromptOpts | ConfirmOpts;
  resolve: (v: string | null | boolean) => void;
};

/** 退场动画时长（毫秒），须与 .motion-sheet 的 --dur-slow 对齐。 */
const EXIT_MS = 320;

export function useDialog(cancelLabel: string, confirmLabel: string) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [closing, setClosing] = useState(false);
  const [value, setValue] = useState("");
  // 用 ref 镜像 pending，使 close 能在 setState 之外读取 resolve，
  // 避免在 setState updater 内调用副作用（StrictMode 下会双调用）。
  const pendingRef = useRef<Pending | null>(null);
  // 打开对话框前持有焦点的元素，关闭时归还焦点。
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 可见 = 有挂起且未在关闭中；presence 负责进/出场过渡与延迟卸载
  const presence = usePresence(!!pending && !closing, EXIT_MS);

  const open = useCallback((p: Pending) => {
    // 堆叠保护：若已有挂起对话框，先按「取消」结算其 promise，避免被覆盖后永悬。
    if (pendingRef.current) {
      const prev = pendingRef.current;
      pendingRef.current = null;
      prev.resolve(prev.kind === "prompt" ? null : false);
    }
    setClosing(false);
    // 在切换焦点前捕获当前焦点元素（通常是触发按钮）
    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    pendingRef.current = p;
    setPending(p);
  }, []);

  const prompt = useCallback(
    (opts: PromptOpts) =>
      new Promise<string | null>((resolve) => {
        open({
          kind: "prompt",
          opts,
          resolve: resolve as (v: string | null | boolean) => void,
        });
      }),
    [open],
  );

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        open({
          kind: "confirm",
          opts,
          resolve: resolve as (v: string | null | boolean) => void,
        });
      }),
    [open],
  );

  const close = useCallback((result: string | null | boolean) => {
    const p = pendingRef.current;
    if (!p) return;
    // 立即 resolve（调用方不必等动画），仅触发退场；真正卸载由 presence 完成
    p.resolve(result);
    pendingRef.current = null;
    setClosing(true);
  }, []);

  // presence 退场结束后：清理 pending/closing，并归还焦点
  useEffect(() => {
    if (!presence.mounted && pending) {
      setPending(null);
      setClosing(false);
      requestAnimationFrame(() => {
        triggerRef.current?.focus?.();
        triggerRef.current = null;
      });
    }
  }, [presence.mounted, pending]);

  // 打开时预填默认值并把焦点移入对话框
  useEffect(() => {
    if (!pending) return;
    if (pending.kind === "prompt") {
      setValue((pending.opts as PromptOpts).defaultValue ?? "");
    }
    const id = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        pending.kind === "prompt"
          ? panel.querySelector<HTMLInputElement>("input")
          : panel.querySelector<HTMLButtonElement>(
              "button[data-autofocus]",
            );
      target?.focus();
      if (pending.kind === "prompt" && target instanceof HTMLInputElement)
        target.select();
    });
    return () => cancelAnimationFrame(id);
  }, [pending]);

  // Esc 关闭（等同取消）
  useEffect(() => {
    if (!pending) return;
    const p = pending;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(p.kind === "prompt" ? null : false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  let dialog: React.ReactNode = null;
  if (pending && presence.mounted) {
    const isPrompt = pending.kind === "prompt";
    const onCancel = () => close(isPrompt ? null : false);
    const onConfirm = () => close(isPrompt ? value : true);
    const opts = pending.opts as PromptOpts & ConfirmOpts;
    dialog = (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center md:items-center"
        role="dialog"
        aria-modal="true"
        aria-label={opts.title}
      >
        <div
          data-state={presence.state}
          onClick={onCancel}
          aria-hidden
          className="motion-overlay absolute inset-0 bg-black/40"
        />
        <div
          ref={panelRef}
          data-state={presence.state}
          className="motion-sheet surface relative z-10 m-3 w-full max-w-md p-4 shadow-lg md:m-4"
        >
          {/* 整体包裹 form：两种模式都支持回车提交 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            <h3 className="mb-3 whitespace-pre-line text-sm font-semibold text-ink">
              {opts.title}
            </h3>
            {isPrompt ? (
              <input
                className="input w-full"
                value={value}
                placeholder={opts.placeholder}
                onChange={(e) => setValue(e.target.value)}
                aria-label={opts.title}
              />
            ) : (
              opts.message && (
                <p className="mb-3 whitespace-pre-line text-sm text-muted">
                  {opts.message}
                </p>
              )
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                type="submit"
                data-autofocus={!isPrompt ? true : undefined}
                className={`btn ${
                  !isPrompt && opts.destructive ? "btn-danger" : "btn-primary"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return { prompt, confirm, dialog };
}
