"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { useNow } from "@/lib/useNow";
import { buildColumns, todayStartMs, localHourAt, isWeekendAt } from "@/lib/grid";
import { prefers12Hour } from "@/lib/time";
import { columnColor, heatBg, type HeatColor } from "@/lib/heatmap";
import { localCityName } from "@/lib/cityName";
import type { AppLocale } from "@/i18n/routing";

/**
 * 时间网格（TC-1）+ 拖拽选区（TC-2）。
 * - 顶部为 UTC 行，其余为各地点行；
 * - 横轴：默认 7 天，每天 24 小时格；
 * - 列锚定到主地点本地整点，再换算为 UTC 绝对时刻，所有行同步对齐；
 * - 拖拽选区锚定到 UTC 毫秒，跨地点行同步高亮（TC-2）；
 * - 选区时长显示由 SelectionBar 承担（TC-12）。
 */
export default function TimeGrid() {
  const t = useTranslations("Grid");
  const locale = useLocale() as AppLocale;
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const dayPeriods = useWorldTimeStore((s) => s.dayPeriods);
  const selection = useWorldTimeStore((s) => s.selection);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const nowRaw = useNow(60_000);

  const home = useMemo(
    () => places.find((p) => p.id === homeId) ?? places[0] ?? null,
    [places, homeId],
  );

  const viewStartDateMs = useWorldTimeStore((s) => s.viewStartDateMs);
  const gcalConnected = useWorldTimeStore((s) => s.gcalConnected);
  // 表头分组：每个连续 dayIndex 段对应一个 <th>，其 colSpan 等于该段在 columns 中的
  // 实际列数（而非固定 24）。这保证表头与表体列在 DST 切换（某日 23 或 25 小时、
  // 或末尾多出 1 列）时仍逐列对齐——否则日期标签会整体相对表体偏移。
  const { columns, dayGroups, colors } = useMemo(() => {
    if (!home) return { columns: [] as ReturnType<typeof buildColumns>, dayGroups: [] as Array<{ dayIndex: number; count: number }>, colors: {} as Record<number, HeatColor> };
    // nowRaw 为 null（SSR/首屏）时用真实「现在」占位，避免以 epoch 0（1970）算起始日。
    const start = viewStartDateMs ?? todayStartMs(home.timeZone, nowRaw ?? Date.now());
    const cols = buildColumns(home.timeZone, start, 7);
    // 按表体顺序扫描，遇 dayIndex 变化即开新段；colSpan = 该段连续列数。
    const groups: Array<{ dayIndex: number; count: number }> = [];
    for (const c of cols) {
      const last = groups[groups.length - 1];
      if (last && last.dayIndex === c.dayIndex) last.count++;
      else groups.push({ dayIndex: c.dayIndex, count: 1 });
    }
    // 热力图：每列一种颜色（取所有地点最差状态，含周末覆盖）
    const colorMap: Record<number, HeatColor> = {};
    for (const c of cols) {
      const col = columnColor(places, c.ms, dayPeriods);
      if (col) colorMap[c.ms] = col;
    }
    return { columns: cols, dayGroups: groups, colors: colorMap };
  }, [home, nowRaw, places, dayPeriods, viewStartDateMs]);

  // Google 日历叠加（6.1）：授权后用示意忙碌区段（主地点本地 10-11 / 14-15，未来 2 天）
  const gcalBusyMs = useMemo(() => {
    const set = new Set<number>();
    if (!home || !gcalConnected) return set;
    const base = nowRaw ? DateTime.fromMillis(nowRaw, { zone: home.timeZone }).startOf("day") : null;
    if (!base) return set;
    for (let d = 0; d < 2; d++) {
      for (const [s, _e] of [[10, 11], [14, 15]] as const) {
        const start = base.plus({ days: d, hours: s }).toMillis();
        set.add(start);
      }
    }
    return set;
  }, [home, nowRaw, gcalConnected]);

  // ---- 拖拽选区状态 ----
  const [dragStartMs, setDragStartMs] = useState<number | null>(null);
  const [dragEndMs, setDragEndMs] = useState<number | null>(null);
  // 拖拽进行态用 state 表达，使其能进入 highlight 的依赖数组（避免在 memo 中读 ref）
  const [isDragging, setIsDragging] = useState(false);
  // 记录拖拽过程中指针是否真的移动到过别的格子（区分「点击」与「拖拽」）。
  // 审查报告 P2：单击（未拖拽）原实现会强制选中 1 小时，导致触屏误触与无法
  // 用指针清除选区。现改为：只有真的移动过才选中；纯点击则清除已有选区。
  const movedRef = useRef(false);

  // 当前高亮范围（拖拽中优先，否则用已确认选区）
  const highlight = useMemo<{ start: number; end: number } | null>(() => {
    if (isDragging && dragStartMs != null && dragEndMs != null) {
      return {
        start: Math.min(dragStartMs, dragEndMs),
        end: Math.max(dragStartMs, dragEndMs) + 3600_000, // 半开到下一整点
      };
    }
    if (selection) return { start: selection.startMs, end: selection.endMs };
    return null;
  }, [isDragging, dragStartMs, dragEndMs, selection]);

  function msFromPoint(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return null;
    const cell = el.closest("td[data-ms]") as HTMLElement | null;
    if (!cell) return null;
    const ms = cell.getAttribute("data-ms");
    return ms ? Number(ms) : null;
  }

  function onPointerDown(e: React.PointerEvent) {
    const ms = msFromPoint(e.clientX, e.clientY);
    if (ms == null) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStartMs(ms);
    setDragEndMs(ms);
    movedRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    const ms = msFromPoint(e.clientX, e.clientY);
    if (ms != null && ms !== dragEndMs) {
      // 仅当落到不同格子时才视为「真移动」，避免微抖动误判
      movedRef.current = true;
      setDragEndMs(ms);
    }
  }

  function onPointerUp(_e: React.PointerEvent) {
    if (!isDragging) return;
    setIsDragging(false);
    // 单击（未移动到别的格子）：清除已有选区，不强制选中 1 小时
    if (!movedRef.current) {
      setSelection(null);
      setDragStartMs(null);
      setDragEndMs(null);
      return;
    }
    if (dragStartMs == null || dragEndMs == null) {
      setSelection(null);
      return;
    }
    const start = Math.min(dragStartMs, dragEndMs);
    const end = Math.max(dragStartMs, dragEndMs) + 3600_000; // 半开区间
    if (end - start <= 0) {
      setSelection(null);
    } else {
      setSelection({ startMs: start, endMs: end });
    }
    setDragStartMs(null);
    setDragEndMs(null);
  }

  if (!home || columns.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        {t("empty")}
      </div>
    );
  }

  /** 格式化某一列在目标时区的显示文字（按小时）。 */
  function cellLabel(zone: string, countryCode: string, ms: number): string {
    const dt = DateTime.fromMillis(ms, { zone });
    const use12 =
      hourFormat === "12" ||
      (hourFormat === "mixed" && prefers12Hour(countryCode));
    return dt.toFormat(use12 ? "h a" : "HH");
  }

  /** 判断某列是否在选区内。 */
  function inHighlight(ms: number): boolean {
    if (!highlight) return false;
    return ms >= highlight.start && ms < highlight.end;
  }

  return (
    <div
      className="overflow-x-auto select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <table className="border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left">
              {localCityName(locale, home)}
            </th>
            {dayGroups.map((g) => {
              const dt = DateTime.fromMillis(
                columns.find((c) => c.dayIndex === g.dayIndex)!.ms,
                { zone: home.timeZone },
              );
              return (
                <th
                  key={g.dayIndex}
                  colSpan={g.count}
                  className="border-b border-l border-gray-200 px-2 py-1 text-center font-semibold text-gray-700"
                >
                  {dt.toFormat("MM-dd EEE")}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <Row
            label="UTC"
            zone="UTC"
            countryCode=""
            columns={columns}
            colorByMs={colors}
            cellLabel={(ms) => cellLabel("UTC", "", ms)}
            inHighlight={inHighlight}
            now={nowRaw}
            busyMs={gcalBusyMs}
          />
          {places.map((p) => (
            <Row
              key={p.id}
              label={`${p.flag} ${localCityName(locale, p)}`}
              zone={p.timeZone}
              countryCode={p.countryCode}
              columns={columns}
              colorByMs={colors}
              cellLabel={(ms) => cellLabel(p.timeZone, p.countryCode, ms)}
              inHighlight={inHighlight}
              now={nowRaw}
              busyMs={gcalBusyMs}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  label,
  zone,
  countryCode,
  columns,
  colorByMs,
  cellLabel,
  inHighlight,
  now,
  busyMs,
}: {
  label: string;
  zone: string;
  countryCode: string;
  columns: ReturnType<typeof buildColumns>;
  colorByMs: Record<number, HeatColor>;
  cellLabel: (ms: number) => string;
  inHighlight: (ms: number) => boolean;
  now: number | null;
  busyMs: Set<number>;
}) {
  return (
    <tr>
      <td className="sticky left-0 z-10 whitespace-nowrap border-b bg-white px-2 py-1 font-medium text-gray-700">
        {label}
      </td>
      {columns.map((c) => {
        const h = localHourAt(zone, c.ms);
        const selected = inHighlight(c.ms);
        // UTC 行无国家归属，跳过周末判定（避免兜底 [6,7] 产生无意义高亮）
        const weekend = countryCode ? isWeekendAt(zone, countryCode, c.ms) : false;
        const busy = busyMs.has(c.ms);
        // 当前小时标记（TC-5 视觉标识）：当前时刻落在该列所在的小时区间内。
        // 用区间判定（c.ms <= now < c.ms + 1h）而非整点地板相等，
        // 以正确支持半小时/45 分钟偏移时区（如 Asia/Kolkata、Asia/Kathmandu）——
        // 这些时区的列 ms 不落在 UTC 整点上，地板相等会导致"现在"标记永不显示。
        const isNow = now ? c.ms <= now && now < c.ms + 3600_000 : false;
        // 优先级：选区 > 热力图 > 周末；Google 日历忙碌叠加为顶部斜线纹理
        const heat = heatBg(colorByMs[c.ms] ?? null);
        const bg = selected
          ? "bg-blue-300 text-blue-900"
          : heat
            ? `${heat} ${weekend ? "underline" : ""}`
            : weekend
              ? "bg-gray-100 text-gray-500"
              : "hover:bg-blue-50";
        return (
          <td
            key={c.ms}
            data-zone={zone}
            data-ms={c.ms}
            data-weekend={weekend ? "1" : "0"}
            data-heat={colorByMs[c.ms] ?? ""}
            data-now={isNow ? "1" : "0"}
            data-busy={busy ? "1" : "0"}
            className={`cursor-cell border-b border-l border-gray-100 px-1 py-1 text-center tabular-nums ${bg} ${
              isNow ? "ring-2 ring-inset ring-pink-500" : ""
            } ${busy ? "border-t-2 border-t-purple-500" : ""}`}
          >
            {cellLabel(c.ms)}
            <span className="block text-[9px] text-gray-400">
              {h.toString().padStart(2, "0")}
            </span>
          </td>
        );
      })}
    </tr>
  );
}
