// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { NextIntlClientProvider } from "next-intl";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import DragHint from "@/components/DragHint";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";

/**
 * 一次性拖选提示（第四期）核心语义测试：
 * 「看过即不再出现」——主动关闭或首次拖出选区后写入本地记忆，
 * 再次进入（无记忆则显示 / 有记忆则隐藏）行为正确。
 *
 * 手段：happy-dom + React 18.3 act + NextIntlClientProvider 注入 zh 文案
 * （与 usePresence.test.ts 同套件模式，不引入 testing-library）。
 */

const HINT_KEY = "worldtime:drag-hint:v1";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  useWorldTimeStore.setState({ selection: null });
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
});

const ZH_MESSAGES = JSON.parse(
  readFileSync(resolve(process.cwd(), "messages/zh.json"), "utf8"),
);

function render() {
  return act(() => {
    root.render(
      <NextIntlClientProvider locale="zh" messages={ZH_MESSAGES}>
        <DragHint />
      </NextIntlClientProvider>,
    );
  });
}

describe("DragHint 一次性拖选提示", () => {
  it("首次进入排期视图（无本地记忆）：显示提示", async () => {
    await render();
    expect(container.querySelector('[data-testid="drag-hint"]')).toBeTruthy();
    expect(
      container.querySelector('[data-testid="drag-hint-dismiss"]'),
    ).toBeTruthy();
  });

  it("已有本地记忆：不再显示", async () => {
    window.localStorage.setItem(HINT_KEY, "1");
    await render();
    expect(container.querySelector('[data-testid="drag-hint"]')).toBeNull();
  });

  it("点击「知道了」：提示消失并写入记忆", async () => {
    await render();
    expect(container.querySelector('[data-testid="drag-hint"]')).toBeTruthy();

    await act(() => {
      const btn = container.querySelector<HTMLButtonElement>(
        '[data-testid="drag-hint-dismiss"]',
      );
      btn?.click();
    });

    expect(container.querySelector('[data-testid="drag-hint"]')).toBeNull();
    expect(window.localStorage.getItem(HINT_KEY)).toBe("1");

    // 卸载重挂（模拟下次会话）：不再显示
    await act(() => root.unmount());
    container = document.createElement("div");
    root = createRoot(container);
    await render();
    expect(container.querySelector('[data-testid="drag-hint"]')).toBeNull();
  });

  it("首次拖出选区：提示自动消失并写入记忆", async () => {
    await render();
    expect(container.querySelector('[data-testid="drag-hint"]')).toBeTruthy();

    await act(() => {
      useWorldTimeStore.setState({
        selection: { startMs: 1, endMs: 3_600_000 },
      });
    });

    expect(container.querySelector('[data-testid="drag-hint"]')).toBeNull();
    expect(window.localStorage.getItem(HINT_KEY)).toBe("1");
  });

  it("localStorage 不可用时静默降级（不报错、本次会话内隐藏）", async () => {
    const spy = vi
      .spyOn(window.localStorage, "getItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    await render();
    // 读取失败视为已读：不显示，且不抛异常
    expect(container.querySelector('[data-testid="drag-hint"]')).toBeNull();
    spy.mockRestore();
  });
});
