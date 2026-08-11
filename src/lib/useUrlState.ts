"use client";

import { useEffect, useRef } from "react";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { decodeState, encodeState } from "@/lib/shareUrl";

/**
 * 在客户端挂载时从 URL 还原状态（MS-6），并在状态变化时回写 URL。
 *
 * - 还原：仅当 URL 含分享参数时覆盖本地状态（URL 优先于本地存储，步骤 2.16）。
 * - 回写：状态变化后用 history.replaceState 同步 URL，保证"随时复制 URL 即分享"。
 *
 * 为避免 SSR 水合不一致，全部逻辑放在 useEffect（仅客户端挂载后）。
 */
export function useUrlStateSync() {
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const selection = useWorldTimeStore((s) => s.selection);
  const cursorMs = useWorldTimeStore((s) => s.cursorMs);
  const setPlaces = useWorldTimeStore((s) => s.setPlaces);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const setCursor = useWorldTimeStore((s) => s.setCursor);

  const hydrated = useRef(false);

  // 1) 挂载时还原
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (typeof window === "undefined") return;
    const q = window.location.search.replace(/^\?/, "");
    if (!q) return;
    const { places: ps, homeId: h, selection: sel, cursorMs: c } = decodeState(q);
    if (ps.length > 0 || sel || c != null) {
      if (ps.length > 0) setPlaces(ps, h);
      if (sel) setSelection(sel);
      if (c != null) setCursor(c);
    }
  }, [setPlaces, setSelection, setCursor]);

  // 2) 状态变化时回写 URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated.current) return;
    const q = encodeState(places, homeId, selection, cursorMs);
    const path = window.location.pathname;
    const newUrl = q ? `${path}?${q}` : path;
    if (window.location.search !== (q ? `?${q}` : "")) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [places, homeId, selection, cursorMs]);
}
