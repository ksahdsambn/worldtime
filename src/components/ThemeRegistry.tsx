"use client";

import { ThemeProvider } from "next-themes";

/**
 * 主题提供者（6.8 明暗主题）。
 * - attribute="class"：通过给 <html> 加 class="dark" 切换深色
 * - defaultTheme="system"：默认跟随系统
 * - enableSystem：允许跟随系统
 */
export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
