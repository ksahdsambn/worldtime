"use client";

import { create } from "zustand";
import type { CityRecord } from "@/lib/types";

/**
 * 小时显示格式（TC-10）。
 * - 12：十二小时制（带 AM/PM）
 * - 24：二十四小时制
 * - mixed：混合模式，每个地点保留其本地原生格式
 */
export type HourFormat = "12" | "24" | "mixed";

/**
 * 时间段定义（4.3.1 配色规则），均可由用户在设置中调整（默认值见 DEFAULT_DAY_PERIODS）。
 * 时段按本地小时（0~23）界定，闭区间起、开区间止。
 */
export interface DayPeriods {
  /** 工作时段，默认 9~18 */
  work: { start: number; end: number };
  /** 可联系时段，默认 6~9 与 18~22（用数组表达两段）*/
  contact: Array<{ start: number; end: number }>;
  /** 休息时段，默认 22~次日 6 */
  rest: { start: number; end: number };
}

/** 默认时段（需求 4.3.1）。 */
export const DEFAULT_DAY_PERIODS: DayPeriods = {
  work: { start: 9, end: 18 },
  contact: [
    { start: 6, end: 9 },
    { start: 18, end: 22 },
  ],
  rest: { start: 22, end: 6 },
};

/**
 * 边界上限（防御性）：避免无上限渲染导致网格 168 列 × N 行爆炸。
 * 分享链接 / 事件码解码同样遵守此上限（见 shareUrl.decodeState）。
 */
export const MAX_PLACES = 30;
/** 自定义显示名最大字符数。 */
export const MAX_CUSTOM_NAME_LEN = 40;

/**
 * 地点条目。
 * placeId 为稳定唯一 id（用于排序、URL 序列化、主地点标记）；
 * 其余字段来自城市记录。
 */
export interface PlaceItem extends CityRecord {
  /** 用户自定义显示名（步骤 3.7 引入，MVP 默认与 city 名一致） */
  customName?: string;
  /**
   * 标签分组（历史字段）：标签 UI 已随功能精简移除，字段保留仅为
   * localStorage 旧数据兼容（避免恢复时丢字段），当前恒为空数组。
   */
  tags: string[];
}

/**
 * 时间选区（TC-2 / TC-12）。
 * 以 epoch 毫秒表达绝对时刻，锚定到 UTC，确保所有地点行同步对齐。
 * start/end 均为闭区间起、开区间止的绝对时刻。
 */
export interface TimeSelection {
  startMs: number;
  endMs: number;
}

/**
 * 主视图模式。
 * - clock：城市时间卡列表（默认）——回答「现在 / 任意时刻，各地几点」；
 * - overlap：时间网格排期——拖拽找共同空闲段并分享。
 */
export type ViewMode = "clock" | "overlap";

/** 网格窗口跨度（天）：默认 1 天一屏放下、无需横滚；可切 7 天全景。 */
export type GridDays = 1 | 7;

interface WorldTimeState {
  /** 已添加地点列表（顺序即展示顺序） */
  places: PlaceItem[];
  /** 主地点 id（无主地点时为 null） */
  homeId: string | null;

  /** 小时格式（TC-10） */
  hourFormat: HourFormat;
  /** 时段定义（4.3.1） */
  dayPeriods: DayPeriods;

  /** 当前选区（TC-2 / TC-12），无选区时为 null */
  selection: TimeSelection | null;

  /**
   * 自定义查看时刻（epoch 毫秒，可精确到分钟）。null 表示实时「现在」。
   * 所有展示视图（时间卡 / 网格标记）统一消费该值；由顶栏时间控制条或
   * 点击网格单元格设定，URL 以 t= 参数分享。
   */
  pinnedMs: number | null;

  /** 主视图模式（默认 clock） */
  viewMode: ViewMode;

  /** 网格窗口天数（默认 1 天） */
  gridDays: GridDays;

  /** 网格视图起始日期（主地点本地午夜，TC-6 任意日期跳转）。null 表示今天。 */
  viewStartDateMs: number | null;

  // ---- 地点操作 ----
  /**
   * 添加地点；若列表为空则自动设为主地点（步骤 2.3 要求）。
   * 返回 false 表示未添加（重复或已达 MAX_PLACES 上限），调用方可据此提示。
   */
  addPlace: (city: CityRecord) => boolean;
  /** 按 id 删除地点；若删除的是主地点，则把剩余首项设为主地点 */
  removePlace: (placeId: string) => void;
  /** 设置主地点 */
  setHome: (placeId: string) => void;
  /** 调整地点顺序（拖拽排序，WC-6） */
  reorderPlaces: (sourceId: string, targetId: string) => void;
  /** 按 id 序列整体重排地点（拖拽排序结果回写，避免多次 splice 抖动） */
  setPlacesOrder: (orderedIds: string[]) => void;
  /** 设置地点显示名（步骤 3.7） */
  renamePlace: (placeId: string, customName: string) => void;
  /** 替换整条地点列表（用于 URL 还原，步骤 2.14） */
  setPlaces: (places: PlaceItem[], homeId: string | null) => void;

  // ---- 设置 ----
  setHourFormat: (fmt: HourFormat) => void;
  setDayPeriods: (dp: DayPeriods) => void;

  // ---- 选区 ----
  setSelection: (sel: TimeSelection | null) => void;

  // ---- 查看时刻 / 视图模式 ----
  /** 设定自定义查看时刻；null 回到实时「现在」 */
  setPinned: (ms: number | null) => void;
  /** 切换主视图模式（时钟 / 重叠时段） */
  setViewMode: (mode: ViewMode) => void;
  /** 切换网格窗口跨度（1 天 / 7 天） */
  setGridDays: (days: GridDays) => void;

  /** 设置网格视图起始日期（TC-6）；null 表示回到今天 */
  setViewStartDate: (ms: number | null) => void;

  // ---- 持久化恢复（避免回访首屏闪一下引导空状态）----
  /** localStorage/URL 状态是否已恢复完毕。恢复前为 false，UI 据此显示轻量骨架。 */
  restored: boolean;
  markRestored: () => void;
}

export const useWorldTimeStore = create<WorldTimeState>((set, get) => ({
  places: [],
  homeId: null,
  hourFormat: "24",
  dayPeriods: DEFAULT_DAY_PERIODS,
  selection: null,
  pinnedMs: null,
  viewMode: "clock",
  gridDays: 1,
  viewStartDateMs: null,
  restored: false,

  addPlace: (city) => {
    let added = false;
    set((state) => {
      // 去重：同一城市仅保留一条
      if (state.places.some((p) => p.id === city.id)) return state;
      // 上限保护：超过 MAX_PLACES 不再添加（分享/事件码解码同样受此约束）
      if (state.places.length >= MAX_PLACES) return state;
      added = true;
      const place: PlaceItem = { ...city, tags: [] };
      const places = [...state.places, place];
      // 列表为空（加入前）时自动设为主地点
      const homeId = state.places.length === 0 ? place.id : state.homeId;
      return { places, homeId };
    });
    return added;
  },

  removePlace: (placeId) =>
    set((state) => {
      const places = state.places.filter((p) => p.id !== placeId);
      let homeId = state.homeId;
      if (state.homeId === placeId) {
        homeId = places.length > 0 ? places[0].id : null;
      }
      // 若被删地点不在列表中，保持原状
      return { places, homeId };
    }),

  setHome: (placeId) => {
    const exists = get().places.some((p) => p.id === placeId);
    if (!exists) return;
    set({ homeId: placeId });
  },

  reorderPlaces: (sourceId, targetId) =>
    set((state) => {
      if (sourceId === targetId) return state;
      const idxSrc = state.places.findIndex((p) => p.id === sourceId);
      const idxTgt = state.places.findIndex((p) => p.id === targetId);
      if (idxSrc === -1 || idxTgt === -1) return state;
      const next = [...state.places];
      const [moved] = next.splice(idxSrc, 1);
      next.splice(idxTgt, 0, moved);
      return { places: next };
    }),

  setPlacesOrder: (orderedIds) =>
    set((state) => {
      // 按 orderedIds 重排；未出现的地点保持原相对顺序追加到末尾
      const byId = new Map(state.places.map((p) => [p.id, p]));
      const next: PlaceItem[] = [];
      const seen = new Set<string>();
      for (const id of orderedIds) {
        const p = byId.get(id);
        if (p) {
          next.push(p);
          seen.add(id);
        }
      }
      for (const p of state.places) {
        if (!seen.has(p.id)) next.push(p);
      }
      return { places: next };
    }),

  renamePlace: (placeId, customName) =>
    set((state) => ({
      places: state.places.map((p) =>
        p.id === placeId
          ? {
              ...p,
              // 截断超长名 + trim；空串回落到 undefined（显示城市原名）
              customName:
                customName.trim().slice(0, MAX_CUSTOM_NAME_LEN) || undefined,
            }
          : p,
      ),
    })),

  setPlaces: (places, homeId) =>
    set({
      // 防御：上限截断；homeId 不在列表则回退首项，避免悬挂主地点
      places: places.slice(0, MAX_PLACES),
      homeId:
        homeId && places.some((p) => p.id === homeId)
          ? homeId
          : (places[0]?.id ?? null),
    }),

  setHourFormat: (fmt) => set({ hourFormat: fmt }),
  setDayPeriods: (dp) => set({ dayPeriods: dp }),
  setSelection: (sel) => set({ selection: sel }),

  setPinned: (ms) => set({ pinnedMs: ms }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setGridDays: (days) => set({ gridDays: days }),

  setViewStartDate: (ms) => set({ viewStartDateMs: ms }),

  markRestored: () => set({ restored: true }),
}));
