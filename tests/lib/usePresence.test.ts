// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createElement, StrictMode } from "react";
import { usePresence } from "@/lib/usePresence";

/**
 * usePresence 单测（第 51 轮遗留项、第 52 轮清偿）。
 *
 * 测试手段：happy-dom（轻量单包）+ React 18.3 自带 act——不引入
 * jsdom / testing-library。rAF 桩成 setTimeout(16ms)，配合 vi 假时钟
 * 完全掌控「双 rAF 进场 / exitMs 退场」编排。
 *
 * 重点固化第 50 轮 P1 修复不变式：关闭路径元素连续挂载（无卸载/重挂
 * DOM 空窗，KeyboardShortcuts 的 Esc 守卫依赖此行为），以及第 51 轮
 * C 维度走查结论的可执行化（StrictMode 双调用、快速抖动不卡 leaving）。
 */

let captured: { mounted: boolean; state: "enter" | "leave" };

function Probe({ open, exitMs }: { open: boolean; exitMs: number }) {
  const p = usePresence(open, exitMs);
  captured = { mounted: p.mounted, state: p.state };
  return null;
}

let root: Root;

/** 渲染探针（strict=true 时包一层 StrictMode，验证 effect 双调用安全性）。 */
function renderProbe(open: boolean, exitMs = 200, strict = false) {
  return act(() => {
    const probe = createElement(Probe, { open, exitMs });
    root.render(strict ? createElement(StrictMode, null, probe) : probe);
  });
}

/** 推进假时钟（rAF 已桩为 16ms 定时器，随时钟一起推进）。 */
function tick(ms: number) {
  return act(() => vi.advanceTimersByTime(ms));
}

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  // rAF → setTimeout(16ms)：双 rAF 编排退化为两次可被假时钟推进的定时器
  vi.stubGlobal(
    "requestAnimationFrame",
    (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16) as unknown as number,
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    (id: number) => clearTimeout(id),
  );
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  root = createRoot(document.createElement("div"));
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("usePresence", () => {
  it("初始即关闭：不挂载，也不误启退场计时", () => {
    renderProbe(false);
    expect(captured.mounted).toBe(false);
    tick(1000);
    expect(captured.mounted).toBe(false);
  });

  it("打开：当帧挂载为隐藏态，双 rAF 后切进场态", () => {
    renderProbe(true);
    expect(captured.mounted).toBe(true);
    expect(captured.state).toBe("leave");
    tick(16); // 第一次 rAF：仅调度第二次
    expect(captured.state).toBe("leave");
    tick(16); // 第二次 rAF：切 enter 触发 CSS 过渡
    expect(captured.state).toBe("enter");
  });

  it("P1 不变式：关闭当帧不卸载，元素连续挂载至 exitMs 结束", () => {
    renderProbe(true);
    tick(32);
    renderProbe(false);
    // 关闭的首次提交仍挂载——无 DOM 空窗，window 级 Esc 守卫由此命中弹层
    expect(captured.mounted).toBe(true);
    expect(captured.state).toBe("leave");
    tick(199);
    expect(captured.mounted).toBe(true);
    tick(1);
    expect(captured.mounted).toBe(false);
  });

  it("快速抖动 true→false→true：重开后关闭仍能正常退出（不卡 leaving）", () => {
    renderProbe(true);
    renderProbe(false);
    tick(50); // 退场中途回到打开（清掉首个退场计时器）
    renderProbe(true);
    expect(captured.mounted).toBe(true);
    tick(32);
    expect(captured.state).toBe("enter");
    renderProbe(false);
    tick(200);
    expect(captured.mounted).toBe(false);
  });

  it("StrictMode effect 双调用：进场编排不中断，关闭后照常卸载", () => {
    renderProbe(true, 200, true);
    expect(captured.mounted).toBe(true);
    tick(32);
    expect(captured.state).toBe("enter");
    renderProbe(false, 200, true);
    tick(200);
    expect(captured.mounted).toBe(false);
  });
});
