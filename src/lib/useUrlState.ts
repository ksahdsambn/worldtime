"use client";

import { useEffect, useRef, useState } from "react";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { decodeState, encodeState } from "@/lib/shareUrl";

/**
 * 在客户端挂载时从 URL 还原状态（MS-6），并在状态变化时回写 URL。
 *
 * - 还原：仅当 URL 含分享参数时覆盖本地状态（URL 优先于本地存储，步骤 2.16）。
 * - 回写：状态变化后用 history.replaceState 同步 URL，保证"随时复制 URL 即分享"。
 *
 * 为避免 SSR 水合不一致，全部逻辑放在 useEffect（仅客户端挂载后）。
 *
 * 就绪门控：回写 effect 在还原流程完成后才启用。否则挂载当次提交里回写会
 * 抢在还原 setPlaces 之前用「空状态」把 URL 参数抹掉（下一帧虽自愈，但产生
 * replaceState 抖动，分享链接在加载瞬间不可复制）。
 */
export function useUrlStateSync() {
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const selection = useWorldTimeStore((s) => s.selection);
  const pinnedMs = useWorldTimeStore((s) => s.pinnedMs);
  const setPlaces = useWorldTimeStore((s) => s.setPlaces);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const setPinned = useWorldTimeStore((s) => s.setPinned);
  const setViewMode = useWorldTimeStore((s) => s.setViewMode);

  const hydrated = useRef(false);
  // 还原完成（或确认无参数）后才允许回写
  const [ready, setReady] = useState(false);

  // 1) 挂载时还原
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (typeof window === "undefined") {
      setReady(true);
      return;
    }
    const q = window.location.search.replace(/^\?/, "");
    if (q) {
      const { places: ps, homeId: h, selection: sel, pinnedMs: t } = decodeState(q);
      if (ps.length > 0 || sel || t != null) {
        if (ps.length > 0) setPlaces(ps, h);
        if (sel) {
          setSelection(sel);
          // 带选区的分享链接：直接落入「重叠时段」排期视图，所见即所享
          setViewMode("overlap");
        }
        if (t != null) setPinned(t);
      }
    }
    setReady(true);
  }, [setPlaces, setSelection, setPinned, setViewMode]);

  // 2) 状态变化时回写 URL（还原完成后启用）
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ready) return;
    const q = encodeState(places, homeId, selection, pinnedMs);
    const path = window.location.pathname;
    const newUrl = q ? `${path}?${q}` : path;
    if (window.location.search !== (q ? `?${q}` : "")) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [places, homeId, selection, pinnedMs, ready]);
}
