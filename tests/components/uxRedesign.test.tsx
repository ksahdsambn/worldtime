// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { NextIntlClientProvider } from "next-intl";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import FirstUseEmptyState from "@/components/FirstUseEmptyState";
import CitySearch from "@/components/CitySearch";
import RecommendationCard from "@/components/RecommendationCard";
import SeoFold from "@/components/SeoFold";
import ViewOptionsMenu from "@/components/ViewOptionsMenu";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { PLACES } from "../helpers";

/**
 * UX 重设计（第 54 轮）无障碍结构抽检 + 新手全路径集成测试；
 * 第 56 轮扩展：快捷开始大卡片化（4 卡等大网格）后的结构与即时加城行为。
 *
 * 目的：以可重复的 DOM 结构断言替代读屏实机抽检（执行总则一.6「无障碍纪律」）：
 * - 任务卡片：原生 button、aria-pressed 选定态、h3 标题进入文档大纲（修复审查
 *   发现五.4 偏离项）；
 * - 快捷开始卡片（第 56 轮）：同为原生 button + h3，无按压态、点击立即加城；
 * - 折叠开关：原生 details/summary（键盘可达、读屏可感知展开态）；
 * - 结论卡：≥2 城门槛（单城不占位）、不透明内容区含主操作按钮；
 * - 收纳菜单：aria-haspopup/aria-expanded 同步、Esc 关闭还焦；
 * - 新手路径「选定任务 → 高亮搜索（聚焦）→ 添加城市 → 自动进入所选模式」。
 */

const MESSAGES = JSON.parse(
  readFileSync(resolve(process.cwd(), "messages/zh.json"), "utf8"),
);

function resetStore() {
  useWorldTimeStore.setState({
    places: [],
    homeId: null,
    viewMode: "clock",
    pendingMode: null,
    searchPulse: 0,
    selection: null,
    restored: true,
  });
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  resetStore();
  container = document.createElement("div");
  // 挂到 document.body：happy-dom 的 focus()/activeElement 依赖元素在文档中
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(el: React.ReactNode) {
  return act(() => {
    root.render(
      <NextIntlClientProvider locale="zh" messages={MESSAGES}>
        {el}
      </NextIntlClientProvider>,
    );
  });
}

describe("任务卡片无障碍结构（第三期）", () => {
  it("四张卡片均为原生 button，任务卡带 aria-pressed，标题在 h3 内（进大纲）", async () => {
    await render(<FirstUseEmptyState />);
    const clock = container.querySelector('[data-testid="task-card-clock"]');
    const overlap = container.querySelector(
      '[data-testid="task-card-overlap"]',
    );
    const quickLocal = container.querySelector(
      '[data-testid="quick-start-local"]',
    );
    const finance = container.querySelector('[data-testid="preset-finance"]');
    for (const card of [clock, overlap, quickLocal, finance]) {
      expect(card?.tagName).toBe("BUTTON");
    }
    // 仅任务卡有选定态（aria-pressed）；快捷开始卡是即时动作，无按压态
    expect(clock?.getAttribute("aria-pressed")).toBe("false");
    expect(overlap?.getAttribute("aria-pressed")).toBe("false");
    expect(quickLocal?.hasAttribute("aria-pressed")).toBe(false);
    expect(finance?.hasAttribute("aria-pressed")).toBe(false);

    // 卡片标题进 h3（文档大纲 h1 品牌 → h2 空状态 → h3 卡片），
    // 顺序：任务时钟 → 任务共同时间 → 从我的时区开始 → 世界金融时钟
    const headings = [...container.querySelectorAll("h3")];
    expect(headings).toHaveLength(4);
    expect(headings[0].querySelector("button")).toBe(clock);
    expect(headings[1].querySelector("button")).toBe(overlap);
    expect(headings[2].querySelector("button")).toBe(quickLocal);
    expect(headings[3].querySelector("button")).toBe(finance);

    // 无 role=button 的假按钮（全部为原生控件）
    expect(
      container.querySelectorAll('[role="button"]'),
    ).toHaveLength(0);
  });

  it("点击卡片即选定任务：aria-pressed 同步 + 触发搜索高亮脉冲", async () => {
    await render(
      <div>
        <FirstUseEmptyState />
        <CitySearch />
      </div>,
    );
    const overlap = container.querySelector<HTMLButtonElement>(
      '[data-testid="task-card-overlap"]',
    );
    await act(() => {
      overlap?.click();
    });
    const s = useWorldTimeStore.getState();
    expect(s.pendingMode).toBe("overlap");
    expect(s.searchPulse).toBe(1);
    expect(
      container
        .querySelector('[data-testid="task-card-overlap"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("新手全路径：选定任务 → 搜索框获得焦点 → 添加首个城市自动进入所选模式", async () => {
    await render(
      <div>
        <FirstUseEmptyState />
        <CitySearch />
      </div>,
    );
    const overlap = container.querySelector<HTMLButtonElement>(
      '[data-testid="task-card-overlap"]',
    );
    await act(() => {
      overlap?.click();
    });
    // 高亮脉冲已触发：搜索输入框获得焦点（引导「下一步：添加城市」）
    const input = container.querySelector<HTMLInputElement>(
      'input[role="combobox"]',
    );
    expect(input).toBeTruthy();
    expect(document.activeElement).toBe(input);

    // 添加首个城市 → 自动进入排期模式并清除待定任务
    await act(() => {
      useWorldTimeStore.getState().addPlace(PLACES.beijing());
    });
    const after = useWorldTimeStore.getState();
    expect(after.viewMode).toBe("overlap");
    expect(after.pendingMode).toBeNull();
  });
});

describe("快捷开始卡片（第 56 轮：大卡片化）", () => {
  it("「从我的时区开始」点击即加城：恰好 3 座（本地时区起步）", async () => {
    await render(<FirstUseEmptyState />);
    const local = container.querySelector<HTMLButtonElement>(
      '[data-testid="quick-start-local"]',
    );
    expect(local?.textContent).toContain("从我的时区开始");
    await act(() => {
      local?.click();
    });
    const s = useWorldTimeStore.getState();
    expect(s.places).toHaveLength(3);
  });

  it("先选定任务再点快捷卡：加城后进入所选模式并清除待定态（addPlace 消费 pendingMode）", async () => {
    await render(<FirstUseEmptyState />);
    // 用户先点了「找个大家都有空的时间」任务卡
    await act(() => {
      useWorldTimeStore.getState().setPendingMode("overlap");
    });
    const local = container.querySelector<HTMLButtonElement>(
      '[data-testid="quick-start-local"]',
    );
    await act(() => {
      local?.click();
    });
    const s = useWorldTimeStore.getState();
    expect(s.places).toHaveLength(3);
    expect(s.viewMode).toBe("overlap");
    expect(s.pendingMode).toBeNull();
  });

  it("「世界金融时钟」点击即加城：纽约 · 伦敦 · 东京", async () => {
    await render(<FirstUseEmptyState />);
    const finance = container.querySelector<HTMLButtonElement>(
      '[data-testid="preset-finance"]',
    );
    // 卡片正文展示三城 chips（flag + 城市名）
    expect(finance?.textContent).toContain("纽约");
    expect(finance?.textContent).toContain("伦敦");
    expect(finance?.textContent).toContain("东京");
    await act(() => {
      finance?.click();
    });
    const s = useWorldTimeStore.getState();
    expect(s.places.map((p) => p.id)).toEqual([
      "us-new-york",
      "gb-london",
      "jp-tokyo",
    ]);
  });
});

describe("推荐结论卡无障碍与门槛（第四期）", () => {
  it("单城市时正确不占位", async () => {
    useWorldTimeStore.setState({ places: [PLACES.beijing()], homeId: "cn-beijing" });
    await render(<RecommendationCard />);
    expect(container.querySelector('[data-testid="recommendation-card"]')).toBeNull();
  });

  it("两城及以上时渲染内容区，含「选中这段」主操作", async () => {
    useWorldTimeStore.setState({
      places: [PLACES.beijing(), PLACES.london()],
      homeId: "cn-beijing",
    });
    await render(<RecommendationCard />);
    const card = container.querySelector('[data-testid="recommendation-card"]');
    expect(card).toBeTruthy();
    expect(card?.getAttribute("aria-label")).toBeTruthy();
    // 有主操作按钮（有推荐时）或冲突说明（无推荐时），两者必居其一
    const apply = container.querySelector<HTMLButtonElement>(
      '[data-testid="recommendation-apply"]',
    );
    const hasEmpty = (card?.textContent ?? "").includes("没有合适的时段");
    expect(apply || hasEmpty).toBeTruthy();
  });
});

describe("SEO 页脚折叠无障碍（第一期）", () => {
  it("折叠使用原生 details/summary（键盘可达、读屏可感知展开态）", async () => {
    await render(
      <SeoFold title="更多城市">
        <p>内容</p>
      </SeoFold>,
    );
    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    const summary = container.querySelector("summary");
    expect(summary?.textContent).toContain("更多城市");
    // 默认收起；summary 为可聚焦控件
    expect(details?.hasAttribute("open")).toBe(false);
    summary?.focus();
    expect(document.activeElement).toBe(summary);
  });
});

describe("视图选项收纳菜单无障碍（第四期）", () => {
  it("触发器同步 aria-expanded；打开后含跨度切换与「回到现在」；Esc 关闭", async () => {
    await render(<ViewOptionsMenu />);
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-testid="view-options"]',
    );
    expect(trigger?.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");

    await act(() => {
      trigger?.click();
    });
    expect(
      container
        .querySelector('[data-testid="view-options"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("true");
    // 等 presence 进出场挂载菜单（200ms 过渡）
    await act(async () => {
      await new Promise((r) => setTimeout(r, 260));
    });
    // 被收纳控件键盘可达：菜单内可 Tab 遍历（原生 button）。
    // 注意 GlassMenu 以 portal 渲染到 document.body，故从 body 查询。
    const days1 = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="days-1"]',
    );
    const days7 = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="days-7"]',
    );
    expect(days1 && days7).toBeTruthy();

    // Esc 关闭菜单
    await act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(
      container
        .querySelector('[data-testid="view-options"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
});
