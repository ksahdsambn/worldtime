"use client";

import { useEffect, useRef } from "react";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { CITY_BY_ID } from "@/data/cities";
import type {
  PlaceItem,
  DayPeriods,
  HourFormat,
  ViewMode,
  GridDays,
} from "@/store/useWorldTimeStore";

/**
 * 本地存储持久化（步骤 2.16）。
 *
 * - 挂载时从 localStorage 恢复 places / homeId / hourFormat / dayPeriods / selection。
 *   URL 分享参数优先（已在 useUrlStateSync 处理：若 URL 带状态则覆盖本地）。
 * - 状态变化时回写 localStorage。
 *
 * 全部在客户端 useEffect 中执行，避免 SSR 水合不一致。
 */

const KEY = "worldtime:v1";

/**
 * 持久化结构。
 * - places：每项含 id + 用户可变字段（customName / tags）。审查报告 P2 修复：
 *   旧版仅存 placeIds，刷新后 customName / tags 全部丢失。现完整保存用户字段，
 *   恢复时与 CITY_BY_ID 基础数据合并。
 * - 兼容旧格式：若读取到的数据仍是 { placeIds: string[] }（无 places 字段），
 *   则回退到旧的「仅 id」恢复路径（customName/tags 不可恢复，符合旧行为）。
 */
interface PersistPlace {
  id: string;
  customName?: string;
  tags?: string[];
}

interface PersistShape {
  /** 用户可变地点数据（新版）。与 placeIds 二选一存在。 */
  places?: PersistPlace[];
  /** 旧版仅存 id 列表（向后兼容读取）。 */
  placeIds?: string[];
  homeId: string | null;
  hourFormat: HourFormat;
  dayPeriods: DayPeriods;
  selectionMs: { start: number; end: number } | null;
  /** 自定义查看时刻（现行字段名）。 */
  pinnedMs: number | null;
  /** 旧版时间游标（向后兼容读取，恢复时迁移到 pinnedMs）。 */
  cursorMs?: number | null;
  viewMode: ViewMode;
  gridDays: GridDays;
}

export function useLocalPersist() {
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const dayPeriods = useWorldTimeStore((s) => s.dayPeriods);
  const selection = useWorldTimeStore((s) => s.selection);
  const pinnedMs = useWorldTimeStore((s) => s.pinnedMs);
  const viewMode = useWorldTimeStore((s) => s.viewMode);
  const gridDays = useWorldTimeStore((s) => s.gridDays);
  const setPlaces = useWorldTimeStore((s) => s.setPlaces);
  const setHourFormat = useWorldTimeStore((s) => s.setHourFormat);
  const setDayPeriods = useWorldTimeStore((s) => s.setDayPeriods);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const setPinned = useWorldTimeStore((s) => s.setPinned);
  const setViewMode = useWorldTimeStore((s) => s.setViewMode);
  const setGridDays = useWorldTimeStore((s) => s.setGridDays);
  const markRestored = useWorldTimeStore((s) => s.markRestored);

  const restored = useRef(false);

  // 1) 挂载时恢复（按字段判定 URL 优先级）
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (typeof window === "undefined") {
      markRestored();
      return;
    }

    // URL 编码的字段优先：p（地点）、s（选区）、t（查看时刻；旧版 c= 游标）。
    // 空值（如 "?p="）视为未携带，与 decodeState 的「空值跳过」语义一致，
    // 避免手工拼的空参数把本地地点清成空列表。
    const hasUrlPlaces = /[?&]p=[^&]/.test(window.location.search);
    const hasUrlSelection = /[?&]s=\d/.test(window.location.search);
    const hasUrlPinned = /[?&][ct]=\d/.test(window.location.search);

    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as PersistShape;

      // 还原 places：仅当 URL 未带 p 参数
      if (!hasUrlPlaces) {
        // 优先用新版完整字段恢复（customName / tags）；回退旧版仅 id 列表
        const persistPlaces = Array.isArray(data.places) ? data.places : null;
        const oldPlaceIds = Array.isArray(data.placeIds) ? data.placeIds : null;
        const source: PersistPlace[] | string[] | null = persistPlaces ?? oldPlaceIds;
        if (source && source.length > 0) {
          const restoredPlaces: PlaceItem[] = [];
          for (const item of source) {
            if (typeof item === "string") {
              // 旧格式：仅 id
              const city = CITY_BY_ID[item];
              if (city) restoredPlaces.push({ ...city, tags: [] });
            } else {
              // 新格式：id + 用户字段，与城市基础数据合并
              const city = CITY_BY_ID[item.id];
              if (city) {
                restoredPlaces.push({
                  ...city,
                  customName: item.customName,
                  tags: Array.isArray(item.tags) ? item.tags : [],
                });
              }
            }
          }
          if (restoredPlaces.length > 0) {
            setPlaces(restoredPlaces, data.homeId ?? restoredPlaces[0].id);
          }
        }
      }
      // hourFormat / dayPeriods / 视图偏好始终从本地恢复（URL 不编码这些）
      if (data.hourFormat) setHourFormat(data.hourFormat);
      if (data.dayPeriods) setDayPeriods(data.dayPeriods);
      if (data.viewMode === "clock" || data.viewMode === "overlap") {
        setViewMode(data.viewMode);
      }
      if (data.gridDays === 1 || data.gridDays === 7) setGridDays(data.gridDays);
      // 选区：仅当 URL 未带 s 参数
      if (!hasUrlSelection && data.selectionMs) {
        setSelection({
          startMs: data.selectionMs.start,
          endMs: data.selectionMs.end,
        });
      }
      // 查看时刻：仅当 URL 未带 t/c 参数；旧 cursorMs 迁移为 pinnedMs
      if (!hasUrlPinned) {
        const pinned = data.pinnedMs ?? data.cursorMs ?? null;
        if (pinned != null) setPinned(pinned);
      }
    } catch {
      // 损坏数据忽略
    } finally {
      // 无论恢复成功与否，都标记「已完成」，让 UI 退出轻量骨架、显示真实空状态。
      markRestored();
    }
  }, [
    setPlaces,
    setHourFormat,
    setDayPeriods,
    setSelection,
    setPinned,
    setViewMode,
    setGridDays,
    markRestored,
  ]);

  // 2) 状态变化时回写
  //    注意：直接读取闭包变量会在"恢复"当次渲染读到旧值（React 闭包），
  //    因此从 store 实时读取最新状态，避免把默认值覆盖回 localStorage。
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!restored.current) return;
    const snap = useWorldTimeStore.getState();
    const payload: PersistShape = {
      // 完整保存用户可变字段（customName / tags），修复刷新丢失问题
      places: snap.places.map((p) => ({
        id: p.id,
        ...(p.customName != null ? { customName: p.customName } : {}),
        tags: p.tags,
      })),
      homeId: snap.homeId,
      hourFormat: snap.hourFormat,
      dayPeriods: snap.dayPeriods,
      selectionMs: snap.selection
        ? { start: snap.selection.startMs, end: snap.selection.endMs }
        : null,
      pinnedMs: snap.pinnedMs,
      viewMode: snap.viewMode,
      gridDays: snap.gridDays,
    };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(payload));
    } catch {
      // 写入失败（隐私模式等）忽略
    }
  }, [places, homeId, hourFormat, dayPeriods, selection, pinnedMs, viewMode, gridDays]);
}
