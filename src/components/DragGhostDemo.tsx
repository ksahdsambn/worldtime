"use client";

import { useEffect, useState } from "react";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { isDragHintSeen, markDragHintSeen } from "@/lib/onboardingFlags";
import { usePresence } from "@/lib/usePresence";

/**
 * 首次拖选的动效教学：一个「幽灵选区」在网格上方自动演示一次横向拖选后淡出。
 *
 * 用动效替代文字 Coachmark（零新增文案）：视觉上示范了网格的核心交互——
 * 按住并横向拖动即可选出会议时段。复用 dragHintSeen 标记：
 * - localStorage 记录已看（worldtime:onboarding.dragHintSeen），只演示一次；
 * - 用户做出真实选区即视为已掌握，立即标记并消失；
 * - prefers-reduced-motion 用户直接跳过（不打扰，也不算已看）。
 *
 * 纯装饰层：aria-hidden、pointer-events-none，不进焦点链、不被读屏播报。
 */
export default function DragGhostDemo() {
  const places = useWorldTimeStore((s) => s.places);
  const selection = useWorldTimeStore((s) => s.selection);
  const [armed, setArmed] = useState(false);
  // 可见 = 已武装且有城市且尚无真实选区
  const visible = armed && places.length > 0 && !selection;
  const presence = usePresence(visible, 400);

  useEffect(() => {
    // reduced-motion：动效教学无意义，跳过（保持未看过状态，Help 弹窗兜底）
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!isDragHintSeen()) setArmed(true);
  }, []);

  // 演示一次后自动退场并标记已看（总时长 ≈ 动画 2.6s + 停留）
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      markDragHintSeen();
      setArmed(false);
    }, 3000);
    return () => clearTimeout(id);
  }, [visible]);

  // 用户抢先做出了真实选区：视为已掌握，立即收起
  useEffect(() => {
    if (selection && armed) {
      markDragHintSeen();
      setArmed(false);
    }
  }, [selection, armed]);

  if (!presence.mounted) return null;

  return (
    <div
      aria-hidden
      data-state={presence.state}
      className="motion-fade pointer-events-none absolute left-[7.5rem] top-14 z-20"
    >
      <div className="wt-ghost-selection" />
    </div>
  );
}
