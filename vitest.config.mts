import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Vitest 配置。
 *
 * - alias "@" -> src，与 tsconfig paths 一致，被测模块的 @/ 引用可正确解析。
 * - environment: node（被测核心算法为纯函数，无 DOM 依赖；luxon 基于 Intl，
 *   Node 内置完整 ICU，时区计算准确）。
 *
 * 仅包含纯函数测试（.ts）。若将来引入 React 组件测试（.tsx），
 * 需先安装 happy-dom 与 @testing-library/react，并将 environment 改为 "happy-dom"，
 * 否则组件中访问 document/window 会抛 ReferenceError。
 */
export default defineConfig({
  resolve: {
    alias: {
      // import.meta.dirname 是 ESM 下 __dirname 的对应物（Node 20.11+ / Vite 5+），
      // 避免 native config loader 把 __dirname 视为 CJS 残留而告警。
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
