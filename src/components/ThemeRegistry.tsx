"use client";

import { ThemeProvider } from "next-themes";
import Toaster from "./Toaster";

/**
 * 主题提供者（6.8 明暗主题）。
 * - attribute="class"：通过给 <html> 加 class="dark" 切换深色
 * - defaultTheme="system"：默认跟随系统
 * - enableSystem：允许跟随系统
 *
 * Toaster 在此挂载一次，全局可用（复制/导出/日历/上限等瞬时反馈）。
 */
export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
