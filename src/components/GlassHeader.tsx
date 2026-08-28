"use client";

import { useLiquidGlass } from "@/lib/useLiquidGlass";

/**
 * sticky 顶栏：panel 层玻璃 + Chromium 折射。
 *
 * page.tsx 是 Server Component，不能调 hook，故抽出 client 岛。
 * 进场用 fade-in 而非 blur-in：残留的 filter:blur(0) 会自成 containing
 * block，把 backdrop-filter 采空。
 * sticky 必须全宽；玻璃面再套 .site-shell。max-width + auto margin 写在
 * sticky 元素上，贴顶后会跳到左槽。
 */
export default function GlassHeader({ children }: { children: React.ReactNode }) {
  const glassRef = useLiquidGlass();
  return (
    <header className="sticky top-0 z-30 w-full shrink-0">
      <div
        ref={glassRef}
        className="site-shell safe-top animate-fade-in liquid-glass liquid-glass--bar rounded-none"
      >
        {children}
      </div>
    </header>
  );
}
