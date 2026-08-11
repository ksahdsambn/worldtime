"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

/** 明暗主题切换（6.8）。 */
export default function ThemeToggle() {
  const t = useTranslations("Theme");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // 避免 SSR/CSR 不一致
    return <span className="inline-block w-[3.5rem]" />;
  }

  const current = theme === "system" ? resolvedTheme : theme;

  return (
    <button
      type="button"
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
      data-testid="theme-toggle"
      className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
      title={t("toggle")}
    >
      {current === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
