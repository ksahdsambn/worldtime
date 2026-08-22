"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { useNow } from "@/lib/useNow";
import FirstUseEmptyState from "./FirstUseEmptyState";
import { buildColumns, todayStartMs } from "@/lib/grid";
import { getCountry } from "@/data/countries";
import { prefers12Hour } from "@/lib/time";
import { placeHeatColor } from "@/lib/heatmap";
import { localCityName } from "@/lib/cityName";
import type { AppLocale } from "@/i18n/routing";
import type { DayPeriods } from "@/store/useWorldTimeStore";

/**
 * 时间网格（TC-1）+ 拖拽选区（TC-2）——「重叠时段」排期视图。
 *
 * 两态改造后的定位：只服务「找共同空闲段 + 分享」；看各地几点走时钟态时间卡。
 * - 行：每座城市一行（无 UTC 参考行，UTC 见顶栏时钟）；
 * - 列：默认 1 天（一屏放下、无横滚），可切 7 天全景；
 * - 列锚定到主地点本地整点，再换算为 UTC 绝对时刻，所有行同步对齐；
 * - 拖拽选区锚定到 UTC 毫秒，跨行同步高亮（TC-2）；纯单击 = 把查看时刻
 *   固定到该格（再次点击同一格取消），与时间控制条共享 pinnedMs；
 * - 热力为单元格级：每格表达该行城市自身的状态（周末/假日/时段），
 *   跨度大时不再出现「整列全红」的信息量塌缩；
 * - 选区时长显示由 SelectionBar 承担（TC-12）。
 */
export default function TimeGrid() {
  const locale = useLocale() as AppLocale;
  const tLoad = useTranslations("Loading");
  const tDate = useTranslations("DateJump");
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const dayPeriods = useWorldTimeStore((s) => s.dayPeriods);
  const selection = useWorldTimeStore((s) => s.selection);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const setViewStartDate = useWorldTimeStore((s) => s.setViewStartDate);
  const gridDays = useWorldTimeStore((s) => s.gridDays);
  const pinnedMs = useWorldTimeStore((s) => s.pinnedMs);
  const setPinned = useWorldTimeStore((s) => s.setPinned);
  const restored = useWorldTimeStore((s) => s.restored);
  const nowRaw = useNow(60_000);

  const home = useMemo(
    () => places.find((p) => p.id === homeId) ?? places[0] ?? null,
    [places, homeId],
  );

  const viewStartDateMs = useWorldTimeStore((s) => s.viewStartDateMs);
  // 表头分组：每个连续 dayIndex 段对应一个 <th>，其 colSpan 等于该段在 columns 中的
  // 实际列数（而非固定 24）。这保证表头与表体列在 DST 切换（某日 23 或 25 小时、
  // 或末尾多出 1 列）时仍逐列对齐——否则日期标签会整体相对表体偏移。
  const { columns, dayGroups } = useMemo(() => {
    if (!home)
      return {
        columns: [] as ReturnType<typeof buildColumns>,
        dayGroups: [] as Array<{ dayIndex: number; count: number }>,
      };
    // nowRaw 为 null（SSR/首屏）时用真实「现在」占位，避免以 epoch 0（1970）算起始日。
    const start = viewStartDateMs ?? todayStartMs(home.timeZone, nowRaw ?? Date.now());
    const cols = buildColumns(home.timeZone, start, gridDays);
    // 按表体顺序扫描，遇 dayIndex 变化即开新段；colSpan = 该段连续列数。
    const groups: Array<{ dayIndex: number; count: number }> = [];
    for (const c of cols) {
      const last = groups[groups.length - 1];
      if (last && last.dayIndex === c.dayIndex) last.count++;
      else groups.push({ dayIndex: c.dayIndex, count: 1 });
    }
    return { columns: cols, dayGroups: groups };
  }, [home, nowRaw, gridDays, viewStartDateMs]);

  // ---- 拖拽选区状态 ----
  const [dragStartMs, setDragStartMs] = useState<number | null>(null);
  const [dragEndMs, setDragEndMs] = useState<number | null>(null);
  // 拖拽进行态用 state 表达，使其能进入 highlight 的依赖数组（避免在 memo 中读 ref）
  const [isDragging, setIsDragging] = useState(false);
  // 记录拖拽过程中指针是否真的移动到过别的格子（区分「点击」与「拖拽」）。
  // 单击（未拖拽）= 固定/取消查看时刻（与时间控制条同一 pinnedMs）；
  // 只有真的移动过才产生选区。
  const movedRef = useRef(false);
  // 拖拽命中测试用 rAF 合帧：pointermove 在快速拖动时每秒触发数十次，原实现每次都
  // document.elementFromPoint（强制命中测试）+ setState，导致单帧多次回流/重渲染。
  // 现把指针位置记入 ref，每帧至多一次命中测试与一次 setState，拖动更顺滑、省 CPU。
  const dragPtRef = useRef<{ x: number; y: number } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  // dragEndMs 的 ref 镜像：rAF 回调里读取最新值做去重，避免闭包捕获过期 state。
  const dragEndMsRef = useRef<number | null>(null);

  // —— 日期表头跳转：点击任意日期分组表头弹出原生 date picker（TC-6 的零文字入口）。
  const datePickerRef = useRef<HTMLInputElement>(null);
  function openDatePicker() {
    const el = datePickerRef.current;
    if (!el) return;
    try {
      // showPicker 需用户手势（表头点击即手势上下文）；旧浏览器无此 API
      (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      el.focus();
    }
  }
  function onDatePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!home) return;
    const v = e.target.value;
    if (!v) return;
    const dt = DateTime.fromISO(v, { zone: home.timeZone }).startOf("day");
    if (dt.isValid) setViewStartDate(dt.toMillis());
  }

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
    dragEndMsRef.current = ms;
    movedRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    dragPtRef.current = { x: e.clientX, y: e.clientY };
    // 本帧已调度则等待，合帧处理
    if (dragRafRef.current != null) return;
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null;
      const pt = dragPtRef.current;
      if (!pt) return;
      const ms = msFromPoint(pt.x, pt.y);
      // 仅当落到不同格子时才视为「真移动」，避免微抖动误判
      if (ms != null && ms !== dragEndMsRef.current) {
        movedRef.current = true;
        dragEndMsRef.current = ms;
        setDragEndMs(ms);
      }
    });
  }

  // 卸载时取消可能挂起的 rAF，避免对已卸载组件 setState
  useEffect(() => {
    return () => {
      if (dragRafRef.current != null) cancelAnimationFrame(dragRafRef.current);
    };
  }, []);

  // M4：手机端首屏自动把「现在」列滚到视口中部。桌面端保留「从今日 00:00 起」的默认定位。
  // 手机若落在最左侧的 00:00，用户需横滑很远才到当前时段；居中后即可见。
  const didAutoScrollRef = useRef(false);
  useEffect(() => {
    if (didAutoScrollRef.current) return;
    if (!restored || columns.length === 0) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    didAutoScrollRef.current = true;
    const id = requestAnimationFrame(() => {
      const cell = document.querySelector<HTMLTableCellElement>(
        'td[data-now="1"]',
      );
      if (cell) cell.scrollIntoView({ block: "nearest", inline: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [restored, columns.length]);

  function onPointerUp(_e: React.PointerEvent) {
    if (!isDragging) return;
    if (dragRafRef.current != null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    // 同步提交最后指针位置（被取消的 rAF 可能尚未跑），
    // 避免快速「移动→抬起」时丢失最后一格。
    const pt = dragPtRef.current;
    if (pt && movedRef.current) {
      const ms = msFromPoint(pt.x, pt.y);
      if (ms != null) dragEndMsRef.current = ms;
    }
    setIsDragging(false);
    // 纯单击（未移动到别的格子）：把查看时刻固定到该格 / 再点同格取消。
    // 与时间控制条共享 pinnedMs，时间卡与网格标记同步冻结。
    if (!movedRef.current) {
      const clicked = dragStartMs;
      if (clicked != null) {
        const cur = useWorldTimeStore.getState().pinnedMs;
        setPinned(cur === clicked ? null : clicked);
      }
      setDragStartMs(null);
      setDragEndMs(null);
      dragEndMsRef.current = null;
      dragPtRef.current = null;
      return;
    }
    // 用 ref 取已刷新的最终 end（setState 异步，state 此刻尚未更新）
    const startMs = dragStartMs;
    const endMs = dragEndMsRef.current;
    if (startMs == null || endMs == null) {
      setSelection(null);
      dragEndMsRef.current = null;
      dragPtRef.current = null;
      return;
    }
    const start = Math.min(startMs, endMs);
    const end = Math.max(startMs, endMs) + 3600_000; // 半开区间
    if (end - start <= 0) {
      setSelection(null);
    } else {
      setSelection({ startMs: start, endMs: end });
    }
    setDragStartMs(null);
    setDragEndMs(null);
    dragEndMsRef.current = null;
    dragPtRef.current = null;
  }

  if (!home || columns.length === 0) {
    // 恢复完成前（localStorage/URL 尚未 hydrate）显示轻量骨架，避免回访用户每次刷新
    // 都闪一下完整引导空状态；恢复后若无城市再显示真正的 FirstUseEmptyState
    // （该兜底通常由 Workspace 处理，此处仅防御直渲染路径）。
    if (!restored) {
      return (
        <div className="hud-frame flex min-h-[40vh] items-center justify-center" aria-busy="true">
          <span className="inline-flex items-center gap-3 text-sm text-muted">
            <span className="chrono-spinner" aria-hidden>
              <span className="chrono-spinner__ring" />
              <span className="chrono-spinner__ring chrono-spinner__ring--inner" />
              <span className="chrono-spinner__dot" />
            </span>
            {tLoad("label")}
          </span>
        </div>
      );
    }
    return (
      <div className="hud-frame">
        <FirstUseEmptyState />
      </div>
    );
  }

  return (
    <div
      className="hud-frame select-none overflow-x-auto overscroll-x-contain"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <table className="wt-grid animate-grid-in text-xs">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky-col sticky left-0 z-10 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink"
            >
              <span className="block max-w-[38vw] truncate md:max-w-none">
                {localCityName(locale, home)}
              </span>
            </th>
            {dayGroups.map((g) => {
              const dt = DateTime.fromMillis(
                columns.find((c) => c.dayIndex === g.dayIndex)!.ms,
                { zone: home.timeZone },
              );
              return (
                <th
                  key={g.dayIndex}
                  scope="colgroup"
                  colSpan={g.count}
                  className="border-l border-line px-2 py-1 text-center text-[11px] font-semibold"
                >
                  <button
                    type="button"
                    onClick={openDatePicker}
                    aria-label={`${tDate("jumpTo")} ${dt.toFormat("yyyy-MM-dd")}`}
                    data-testid="day-header-jump"
                    className="w-full cursor-pointer rounded-sm px-1 py-1 transition-colors duration-150 hover:bg-surface-hover hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                  >
                    {dt.toFormat("MM-dd EEE")}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {places.map((p) => (
            <Row
              key={p.id}
              label={`${p.flag} ${localCityName(locale, p)}`}
              zone={p.timeZone}
              countryCode={p.countryCode}
              columns={columns}
              dayPeriods={dayPeriods}
              hourFormat={hourFormat}
              highlight={highlight}
              now={nowRaw}
              pinnedMs={pinnedMs}
            />
          ))}
        </tbody>
      </table>

      {/* 隐藏的日期选择器：由日期表头按钮唤起原生 picker（sr-only 保持可聚焦） */}
      <input
        ref={datePickerRef}
        type="date"
        onChange={onDatePickerChange}
        aria-label={tDate("jumpTo")}
        tabIndex={-1}
        className="sr-only"
      />
    </div>
  );
}

const Row = memo(function Row({
  label,
  zone,
  countryCode,
  columns,
  dayPeriods,
  hourFormat,
  highlight,
  now,
  pinnedMs,
}: {
  label: string;
  zone: string;
  countryCode: string;
  columns: ReturnType<typeof buildColumns>;
  dayPeriods: DayPeriods;
  hourFormat: "12" | "24" | "mixed";
  /** 选区高亮范围（半开区间）；null 表示无高亮。传范围对象而非闭包，便于 memo。 */
  highlight: { start: number; end: number } | null;
  now: number | null;
  pinnedMs: number | null;
}) {
  // 每格需要的信息（显示文字 + 周末 + 自身热力色 + 是否每日首列）集中 memo，且对每列仅
  // 构造一次 DateTime 复用于「文字格式化」「周末判定」「热力判定」多处。依赖
  // columns/zone/countryCode/dayPeriods/hourFormat，不含 now —— 故每 60s 的 now tick
  // 命中缓存，跳过全部 DateTime 分配（网格最大的 GC 压力源）。
  const cellInfo = useMemo(() => {
    const use12 =
      hourFormat === "12" ||
      (hourFormat === "mixed" && prefers12Hour(countryCode));
    const weekendDays = countryCode ? getCountry(countryCode).weekendDays : null;
    return columns.map((c, i) => {
      const dt = DateTime.fromMillis(c.ms, { zone });
      // 周末底纹：该地本地周六/周日的弱提示（热力色由 data-heat 承担）
      const weekend =
        weekendDays && dt.isValid ? weekendDays.includes(dt.weekday) : false;
      // 单元格级热力：该行城市在此时刻自身的状态（周末/假日覆盖 + 时段判定）
      const heat = placeHeatColor(zone, countryCode, c.ms, dayPeriods);
      // 每日首列（dayIndex 变化处）：唯一完整显示小时数字的列；
      // 其余列数字淡化（CSS .h-ghost），悬停恢复——降噪但零信息损失。
      const dayFirst = i === 0 || columns[i - 1].dayIndex !== c.dayIndex;
      return {
        primary: dt.toFormat(use12 ? "h a" : "HH"),
        alt: use12 && dayFirst ? dt.toFormat("HH") : null,
        weekend,
        heat,
        dayFirst,
      };
    });
  }, [columns, zone, countryCode, dayPeriods, hourFormat]);

  return (
    <tr>
      <td
        scope="row"
        className="sticky-col sticky left-0 z-10 select-text px-3 py-1.5 text-[13px] font-medium text-ink"
      >
        <span className="block max-w-[38vw] truncate md:max-w-none">{label}</span>
      </td>
      {columns.map((c, i) => {
        const info = cellInfo[i];
        // 当前小时标记（TC-5）：当前时刻落在该列所在的小时区间内。
        // 用区间判定（c.ms <= now < c.ms + 1h）以正确支持半小时/45 分钟偏移时区
        // （Asia/Kolkata、Asia/Kathmandu 等列 ms 不落在 UTC 整点上）。
        // 单元格的视觉状态（热力 / 周末 / 选区 / 现在 / 固定时刻）全部由 data-* 属性
        // 驱动 globals.css 的令牌化规则，优先级在那里靠源码顺序保证。
        const isNow = now ? c.ms <= now && now < c.ms + 3600_000 : false;
        const isPinned =
          pinnedMs != null && c.ms <= pinnedMs && pinnedMs < c.ms + 3600_000;
        return (
          <td
            key={c.ms}
            data-zone={zone}
            data-ms={c.ms}
            data-weekend={info.weekend ? "1" : "0"}
            data-heat={info.heat ?? ""}
            data-now={isNow ? "1" : "0"}
            data-pinned={isPinned ? "1" : "0"}
            data-selected={
              highlight ? c.ms >= highlight.start && c.ms < highlight.end ? "1" : "0" : "0"
            }
            className="cursor-cell px-1 py-1.5 text-center"
          >
            <span className={info.dayFirst ? "tabular-nums" : "tabular-nums h-ghost"}>
              {info.primary}
            </span>
            {info.alt && (
              <span className="block text-[11px] leading-none text-faint tabular-nums">
                {info.alt}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
});
