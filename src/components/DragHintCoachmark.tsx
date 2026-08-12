"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { isDragHintSeen, markDragHintSeen } from "@/lib/onboardingFlags";
import { usePresence } from "@/lib/usePresence";

/**
 * 拖拽选区上下文提示（渐进式发现）。
 *
 * 当「已有城市、但用户从未做过选区」时浮现一次，在核心机制恰好可用时教用户：
 * - localStorage 记录已看（worldtime:onboarding.dragHintSeen），只出现一次；
 * - 用户首次做出选区即视为已掌握 → 自动标记并消失；
 * - 「知道了」按钮可主动关闭。
 *
 * 不阻塞、永不重复打扰。SSR 默认不显示，挂载后据本地标志判定，避免水合不一致。
 */
export default function DragHintCoachmark() {
  const t = useTranslations("Onboarding");
  const places = useWorldTimeStore((s) => s.places);
  const selection = useWorldTimeStore((s) => s.selection);
  const [show, setShow] = useState(false);
  // 可见 = 未看过且有城市；进出淡入淡出（首次出现更柔和，消失不突兀）
  const visible = show && places.length > 0;
  const presence = usePresence(visible, 200);

  useEffect(() => {
    if (!isDragHintSeen()) setShow(true);
  }, []);

  // 一旦做出选区，视为已掌握该机制：标记并隐藏。
  useEffect(() => {
    if (selection) {
      markDragHintSeen();
      setShow(false);
    }
  }, [selection]);

  if (!presence.mounted) return null;

  return (
    <div
      role="status"
      data-state={presence.state}
      className="motion-fade surface absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-3 px-3.5 py-2 shadow-md no-print"
    >
      <span className="text-left text-sm text-ink">{t("dragHint")}</span>
      <button
        type="button"
        onClick={() => {
          markDragHintSeen();
          setShow(false);
        }}
        className="btn btn-sm btn-primary shrink-0"
      >
        {t("dragGotIt")}
      </button>
    </div>
  );
}
