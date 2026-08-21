"use client";

import { useLiquidGlass } from "@/lib/useLiquidGlass";

/**
 * 首页 sticky 顶栏：panel 层玻璃 + Chromium 折射。
 *
 * page.tsx 是 Server Component，不能调 hook，故抽出 client 岛。
 * 进场用 fade-in 而非 blur-in：残留的 filter:blur(0) 会自成 containing
 * block，把 backdrop-filter 采空。圆角为 0 的全宽条，MAX_MAP_EDGE 会自动
 * 降低采样率。
 */
export default function GlassHeader({ children }: { children: React.ReactNode }) {
  const glassRef = useLiquidGlass();
  return (
    <header
      ref={glassRef}
      className="safe-top animate-fade-in liquid-glass liquid-glass--bar sticky top-0 z-30"
    >
      {children}
    </header>
  );
}
