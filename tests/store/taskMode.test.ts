import { describe, it, expect, beforeEach } from "vitest";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { PLACES } from "../helpers";

/**
 * 第三期：任务卡片引导流的 store 行为测试。
 *
 * 覆盖需求 3.2 交互规则：
 * - 空状态点任务卡片（setPendingMode）→ 添加第一个城市后自动进入所选模式；
 * - 未选任务直接添加城市 → 维持默认时钟模式；
 * - 已有城市后 pendingMode 不再生效（入口卡片本就不展示，此处锁 store 语义）；
 * - 分享链接路径（setPlaces 批量还原）不受 pendingMode 干扰。
 */
function reset() {
  useWorldTimeStore.setState({
    places: [],
    homeId: null,
    viewMode: "clock",
    pendingMode: null,
    searchPulse: 0,
    restored: true,
  });
}

describe("任务卡片引导流（第三期）", () => {
  beforeEach(reset);

  it("未选任务直接添加城市：维持默认时钟模式", () => {
    const s = useWorldTimeStore.getState();
    s.addPlace(PLACES.beijing());
    expect(useWorldTimeStore.getState().viewMode).toBe("clock");
    expect(useWorldTimeStore.getState().pendingMode).toBeNull();
  });

  it("选「找共同时间」卡片 → 添加首个城市自动进入 overlap 模式并清除待定任务", () => {
    const s = useWorldTimeStore.getState();
    s.setPendingMode("overlap");
    expect(useWorldTimeStore.getState().searchPulse).toBe(0);

    const added = s.addPlace(PLACES.beijing());
    expect(added).toBe(true);
    const after = useWorldTimeStore.getState();
    expect(after.viewMode).toBe("overlap");
    expect(after.pendingMode).toBeNull();
    // 首城自动设为主地点（既有行为不受影响）
    expect(after.homeId).toBe("cn-beijing");
  });

  it("选「时钟」卡片 → 添加首个城市进入 clock 模式", () => {
    const s = useWorldTimeStore.getState();
    s.setPendingMode("clock");
    s.addPlace(PLACES.beijing());
    expect(useWorldTimeStore.getState().viewMode).toBe("clock");
  });

  it("切换任务卡片：后选覆盖先选", () => {
    const s = useWorldTimeStore.getState();
    s.setPendingMode("clock");
    s.setPendingMode("overlap");
    expect(useWorldTimeStore.getState().pendingMode).toBe("overlap");
    s.addPlace(PLACES.london());
    expect(useWorldTimeStore.getState().viewMode).toBe("overlap");
  });

  it("已有城市后 pendingMode 不生效（规则：入口只在空状态展示）", () => {
    const s = useWorldTimeStore.getState();
    s.addPlace(PLACES.beijing());
    useWorldTimeStore.setState({ pendingMode: "overlap" });
    // 再加城市不应触发模式切换（places.length > 0 分支）
    s.addPlace(PLACES.newYork());
    const after = useWorldTimeStore.getState();
    expect(after.viewMode).toBe("clock");
    // pendingMode 残留不影响行为；setPendingMode(null) 可清除
    s.setPendingMode(null);
    expect(useWorldTimeStore.getState().pendingMode).toBeNull();
  });

  it("分享链接路径：setPlaces 批量还原不受 pendingMode 干扰（直达排期视图）", () => {
    const s = useWorldTimeStore.getState();
    useWorldTimeStore.setState({ pendingMode: "clock" });
    const [bj, ny] = [PLACES.beijing(), PLACES.newYork()];
    // URL 还原走 setPlaces + setViewMode（useUrlStateSync 的顺序）
    s.setPlaces([bj, ny], bj.id);
    s.setViewMode("overlap");
    const after = useWorldTimeStore.getState();
    expect(after.viewMode).toBe("overlap");
    expect(after.places).toHaveLength(2);
  });

  it("pulseSearch 自增高亮脉冲计数", () => {
    const s = useWorldTimeStore.getState();
    s.pulseSearch();
    s.pulseSearch();
    expect(useWorldTimeStore.getState().searchPulse).toBe(2);
  });

  it("快捷开始按钮路径（选任务后一键多城）：首城落位即切模式", () => {
    const s = useWorldTimeStore.getState();
    s.setPendingMode("overlap");
    // FirstUseEmptyState.apply 循环 addPlace（模拟预设城市组）
    for (const p of [PLACES.beijing(), PLACES.newYork(), PLACES.london()]) {
      s.addPlace(p);
    }
    const after = useWorldTimeStore.getState();
    expect(after.viewMode).toBe("overlap");
    expect(after.places).toHaveLength(3);
  });
});
