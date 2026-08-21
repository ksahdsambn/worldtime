"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorldTimeStore, type HourFormat } from "@/store/useWorldTimeStore";
import { usePresence } from "@/lib/usePresence";
import GlassMenu from "./GlassMenu";

/**
 * 设置面板（小时格式等）。
 * 步骤 2.8 仅提供小时格式切换；工作时段配置等留待后续增强。
 *
 * 可访问性：菜单打开后监听文档 pointerdown（点击外部关闭）与 Escape，
 * 关闭时把焦点还给触发按钮，避免移动端用户被困住。
 */
export default function SettingsPanel() {
  const t = useTranslations("Settings");
  const tCom = useTranslations("Common");
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const setHourFormat = useWorldTimeStore((s) => s.setHourFormat);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  // 弹层进出过渡（关闭时多挂载一帧播放退出）
  const presence = usePresence(open, 200);

  const options: Array<{ value: HourFormat; label: string }> = [
    { value: "12", label: t("fmt12") },
    { value: "24", label: t("fmt24") },
    { value: "mixed", label: t("fmtMixed") },
  ];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (
        containerRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {tCom("settings")}
      </button>
      {presence.mounted && (
        <GlassMenu
          ref={menuRef}
          anchorRef={buttonRef}
          align="end"
          width={224}
          data-state={presence.state}
          role="menu"
          aria-label={t("hourFormat")}
          className="motion-pop p-3"
        >
          <p className="mb-2 text-xs font-semibold text-ink">
            {t("hourFormat")}
          </p>
          <div role="group" className="space-y-1">
            {options.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="hourFormat"
                  value={o.value}
                  checked={hourFormat === o.value}
                  onChange={() => setHourFormat(o.value)}
                  data-testid={`fmt-${o.value}`}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </GlassMenu>
      )}
    </div>
  );
}
