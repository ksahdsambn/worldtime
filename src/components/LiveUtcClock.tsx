"use client";

import { DateTime } from "luxon";
import { useNow } from "@/lib/useNow";

/**
 * 顶栏 UTC 实时钟（秒级）。仅 xl+ 显示，避免挤占搜索与操作簇。
 * 不用 aria-live：每秒播报会打断读屏；可见文字本身可供查阅。
 */
export default function LiveUtcClock() {
  const now = useNow(1000);
  const stamp = now
    ? DateTime.fromMillis(now, { zone: "UTC" }).toFormat("HH:mm:ss")
    : "--:--:--";

  return (
    <div className="hidden items-center gap-2 xl:flex">
      <span className="live-dot" aria-hidden />
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
        UTC
      </span>
      <span className="chrono text-[15px] text-ink">{stamp}</span>
    </div>
  );
}
