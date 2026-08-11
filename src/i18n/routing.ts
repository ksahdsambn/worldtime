import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // 中文为默认语言，英文为备选
  locales: ["zh", "en"],
  defaultLocale: "zh",
});

export type AppLocale = (typeof routing.locales)[number];
