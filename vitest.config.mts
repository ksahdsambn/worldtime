import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Vitest 配置。
 *
 * - alias "@" -> src，与 tsconfig paths 一致，被测模块的 @/ 引用可正确解析。
 * - environment: node（被测核心算法为纯函数，无 DOM 依赖；luxon 基于 Intl，
 *   Node 内置完整 ICU，时区计算准确）。需要 DOM 的测试文件用
 *   `// @vitest-environment happy-dom` 按文件切换（如 usePresence / DragHint）。
 * - oxc.jsx 覆盖 tsconfig 的 "preserve"：vitest v4 以 rolldown/oxc 转译，
 *   Next 的 jsx=preserve 会原样保留 JSX 导致测试无法解析 .tsx 组件，需显式
 *   改为 automatic（React 17+ JSX 运行时，无需手动 import React）。
 * - include 放宽到 .tsx：第四期起引入 React 组件测试（tests/components/*）。
 */
export default defineConfig({
  resolve: {
    alias: {
      // import.meta.dirname 是 ESM 下 __dirname 的对应物（Node 20.11+ / Vite 5+），
      // 避免 native config loader 把 __dirname 视为 CJS 残留而告警。
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    globals: true,
  },
});
