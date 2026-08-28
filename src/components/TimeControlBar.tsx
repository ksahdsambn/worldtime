"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { useNow } from "@/lib/useNow";
import { prefers12Hour } from "@/lib/time";
import { IconClock, IconCheck, IconClose } from "./icons";

/**
 * 时间控制条：整个应用的「查看时刻」单一入口。
 *
 * - 实时态：显示主地点本地时间（走秒），点击即进入编辑——控件本身即功能，
 *   不需要任何引导文案；
 * - 编辑态：原生 datetime-local 输入（精确到分钟），Enter 确认 / Esc 取消；
 * - 固定态：显示被固定的时刻，点 × 回到现在。
 *
 * pinnedMs 为 null 时所有视图实时走时；设定后时间卡与网格标记统一冻结在该
 * 时刻，并通过分享链接的 t= 参数传播。
 */
export default function TimeControlBar() {
  const t = useTranslations("Viewing");
  const tCom = useTranslations("Common");
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const pinnedMs = useWorldTimeStore((s) => s.pinnedMs);
  const setPinned = useWorldTimeStore((s) => s.setPinned);

  const home = places.find((p) => p.id === homeId) ?? places[0];
  const nowRaw = useNow(1000);
  const use12 = hourFormat === "12" || (hourFormat === "mixed" && prefers12Hour(home?.countryCode ?? ""));

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 进入编辑时以当前查看时刻（固定值或现在）预填输入框；
  // 记住预填值：失焦时若未做任何修改且原本处于实时态，仅收起而不「误固定此刻」。
  const baseDraftRef = useRef("");
  function openEditor() {
    if (!home) return;
    const base = pinnedMs ?? Date.now();
    const draft = DateTime.fromMillis(base, { zone: home.timeZone }).toFormat(
      "yyyy-MM-dd'T'HH:mm",
    );
    setDraft(draft);
    baseDraftRef.current = draft;
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function applyDraft() {
    if (!home) return closeEditor();
    const dt = DateTime.fromISO(draft, { zone: home.timeZone });
    if (dt.isValid) setPinned(dt.toMillis());
    setEditing(false);
  }

  function onBlur() {
    // 原本已固定：失焦=确认输入；原本实时且未改动：视为放弃编辑
    if (pinnedMs != null || draft !== baseDraftRef.current) applyDraft();
    else setEditing(false);
  }

  function closeEditor() {
    setEditing(false);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      applyDraft();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeEditor();
    }
  }

  if (!home) return null;

  // nowRaw 为 null（挂载后首个 tick 前）时用占位，避免闪 1970
  const liveLabel =
    nowRaw != null
      ? DateTime.fromMillis(nowRaw, { zone: home.timeZone }).toFormat(
          use12 ? "h:mm:ss a" : "HH:mm:ss",
        )
      : "--:--:--";
  const pinnedLabel =
    pinnedMs != null
      ? DateTime.fromMillis(pinnedMs, { zone: home.timeZone }).toFormat("MM-dd HH:mm")
      : "";

  return (
    <div className="flex items-center" data-testid="time-control-bar">
      {editing ? (
        <span className="animate-fade-in flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="datetime-local"
            step={60}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onInputKey}
            onBlur={onBlur}
            aria-label={t("pick")}
            data-testid="time-input"
            className="input !w-auto px-2 py-1 text-xs"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={applyDraft}
            aria-label={tCom("confirm")}
            data-testid="time-apply"
            className="btn-primary btn-sm !px-2"
          >
            <IconCheck className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={closeEditor}
            aria-label={tCom("cancel")}
            data-testid="time-cancel"
            className="icon-btn !h-7 !w-7"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : pinnedMs != null ? (
        <span className="animate-fade-in flex items-center gap-1 rounded-full border border-line py-1 pl-3 pr-1">
          <IconClock className="h-3.5 w-3.5 text-warm-strong" aria-hidden />
          {/* 点值重新编辑；× 回到实时 */}
          <button
            type="button"
            onClick={openEditor}
            data-testid="time-pinned"
            title={t("pick")}
            className="chrono cursor-pointer rounded-sm px-0.5 text-sm font-semibold tabular-nums text-ink transition-colors duration-150 hover:text-warm-strong focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
          >
            {pinnedLabel}
          </button>
          <button
            type="button"
            onClick={() => setPinned(null)}
            aria-label={t("backToNow")}
            title={t("backToNow")}
            data-testid="time-reset"
            className="icon-btn !h-6 !w-6"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          data-testid="time-bar-now"
          title={t("pick")}
          className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 transition-colors duration-150 hover:border-line-strong hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        >
          <span className="live-dot" aria-hidden />
          <span className="text-xs font-medium text-muted">{t("now")}</span>
          <span className="chrono text-sm font-semibold tabular-nums text-ink">
            {liveLabel}
          </span>
        </button>
      )}
    </div>
  );
}
