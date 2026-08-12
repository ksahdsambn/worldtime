"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";
import { useNow } from "@/lib/useNow";
import FirstUseEmptyState from "./FirstUseEmptyState";
import { buildColumns, todayStartMs, isWeekendAt } from "@/lib/grid";
import { prefers12Hour } from "@/lib/time";
import { columnColor, type HeatColor } from "@/lib/heatmap";
import { localCityName } from "@/lib/cityName";
import { toast } from "@/lib/toast";
import type { AppLocale } from "@/i18n/routing";
import {
  busyRangesToMs,
  fetchFreeBusy,
  freeBusyWindow,
  GcalUnauthorizedError,
  isAbortError,
  type BusyRange,
} from "@/lib/gcal";
import { clearGcalSession, requestSilentRefresh } from "@/lib/gcal-auth";

/**
 * 时间网格（TC-1）+ 拖拽选区（TC-2）。
 * - 顶部为 UTC 行，其余为各地点行；
 * - 横轴：默认 7 天，每天 24 小时格；
 * - 列锚定到主地点本地整点，再换算为 UTC 绝对时刻，所有行同步对齐；
 * - 拖拽选区锚定到 UTC 毫秒，跨地点行同步高亮（TC-2）；
 * - 选区时长显示由 SelectionBar 承担（TC-12）。
 */
export default function TimeGrid() {
  const locale = useLocale() as AppLocale;
  const tGcal = useTranslations("Gcal");
  const tLoad = useTranslations("Loading");
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const dayPeriods = useWorldTimeStore((s) => s.dayPeriods);
  const selection = useWorldTimeStore((s) => s.selection);
  const setSelection = useWorldTimeStore((s) => s.setSelection);
  const restored = useWorldTimeStore((s) => s.restored);
  const nowRaw = useNow(60_000);

  const home = useMemo(
    () => places.find((p) => p.id === homeId) ?? places[0] ?? null,
    [places, homeId],
  );

  const viewStartDateMs = useWorldTimeStore((s) => s.viewStartDateMs);
  const gcalAccessToken = useWorldTimeStore((s) => s.gcalAccessToken);
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

  // Google 日历叠加（6.1）：授权后调 freebusy 拉真实忙碌区间。
  const [busyRanges, setBusyRanges] = useState<BusyRange[]>([]);
  // 叠加态：idle 正常 / loading 拉取中 / error 可重试错误 / disconnected 会话失效需重连。
  const [gcalStatus, setGcalStatus] = useState<
    "idle" | "loading" | "error" | "disconnected"
  >("idle");
  // 重试计数器：点击「重试」时自增，触发 effect 重跑。
  const [gcalRetryKey, setGcalRetryKey] = useState(0);
  const homeTimeZone = home?.timeZone ?? null;
  // 把文案放进 ref，避免 locale 切换导致 freebusy 重拉（deps 不含 tGcal）。
  const tGcalRef = useRef(tGcal);
  tGcalRef.current = tGcal;
  useEffect(() => {
    // 未授权或无主地点：清空，不请求
    if (!gcalAccessToken || !homeTimeZone) {
      setBusyRanges([]);
      setGcalStatus("idle");
      return;
    }
    // 窗口 = 当前视图起始日 + 7 天。刻意不依赖 nowRaw（每分钟 tick），避免每分钟重拉；
    // 跨午夜后窗口不会自动推进，用户交互或刷新页面时会重算（会议排期场景可接受）。
    const start = viewStartDateMs ?? todayStartMs(homeTimeZone, Date.now());
    const win = freeBusyWindow(start, 7);
    // 由本 effect 持有 controller：卸载 / 依赖变化时取消进行中的请求，避免泄漏 + 卡 loading。
    const controller = new AbortController();
    let refreshed = false;
    setGcalStatus("loading");
    async function run(token: string) {
      try {
        const ranges = await fetchFreeBusy(token, {
          timeMin: win.timeMin,
          timeMax: win.timeMax,
          timeZone: homeTimeZone,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setBusyRanges(ranges);
        setGcalStatus("idle");
      } catch (e) {
        if (controller.signal.aborted || isAbortError(e)) return;
        if (e instanceof GcalUnauthorizedError) {
          if (!refreshed) {
            // token 过期：静默刷新后用新 token 重试一次
            refreshed = true;
            const fresh = await requestSilentRefresh();
            if (controller.signal.aborted) return;
            if (!fresh) {
              // Google 会话已失效：断开，提示用户重新连接
              clearGcalSession();
              setBusyRanges([]);
              setGcalStatus("disconnected");
              toast.error(tGcalRef.current("disconnected"));
            }
            // 成功则 callback 已更新 store.gcalAccessToken，本 effect 会因依赖变化自动
            // 重跑拉取，无需在此递归——否则与 effect 重跑会重复发起一次 freebusy 请求
          } else {
            // 已刷新仍 401：会话失效
            clearGcalSession();
            setBusyRanges([]);
            setGcalStatus("disconnected");
            toast.error(tGcalRef.current("disconnected"));
          }
        } else {
          // 其他错误（网络 / 5xx / 超时 / 解析）：保留空叠加，不打断核心功能，
          // 但用横幅 + toast 显式提示，并提供重试。
          setBusyRanges([]);
          setGcalStatus("error");
          toast.error(tGcalRef.current("overlayFailed"));
        }
      }
    }
    run(gcalAccessToken);
    return () => {
      controller.abort();
    };
  }, [gcalAccessToken, viewStartDateMs, homeTimeZone, gcalRetryKey]);

  // 把忙碌区间投影到当前列（只含真实存在的 column ms，与 Row 的 has() 语义对齐）
  const gcalBusyMs = useMemo(
    () => busyRangesToMs(busyRanges, columns),
    [busyRanges, columns],
  );

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
    // 恢复完成前（localStorage/URL 尚未 hydrate）显示轻量骨架，避免回访用户每次刷新
    // 都闪一下完整引导空状态；恢复后若无城市再显示真正的 FirstUseEmptyState。
    if (!restored) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
          <span className="text-sm text-muted">
            <span
              className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-accent align-middle"
              aria-hidden
            />
            {tLoad("label")}
          </span>
        </div>
      );
    }
    return <FirstUseEmptyState />;
  }

  /**
   * 格式化某一列在目标时区的显示文字（按小时）。
   * 12 小时制下额外返回 24 小时对照（alt），便于跨时区心算；
   * 24 小时制下 alt 为 null（与 primary 冗余，不重复显示）。
   */
  function cellLabel(
    zone: string,
    countryCode: string,
    ms: number,
  ): { primary: string; alt: string | null } {
    const dt = DateTime.fromMillis(ms, { zone });
    const use12 =
      hourFormat === "12" ||
      (hourFormat === "mixed" && prefers12Hour(countryCode));
    return {
      primary: dt.toFormat(use12 ? "h a" : "HH"),
      alt: use12 ? dt.toFormat("HH") : null,
    };
  }

  /** 判断某列是否在选区内。 */
  function inHighlight(ms: number): boolean {
    if (!highlight) return false;
    return ms >= highlight.start && ms < highlight.end;
  }

  return (
    <div
      className="select-none overflow-x-auto overscroll-x-contain"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {gcalStatus === "error" && (
        <div
          role="alert"
          className="mb-2 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs"
          style={{
            borderColor: "var(--heat-caution-ink)",
            backgroundColor: "var(--heat-caution)",
            color: "var(--text)",
          }}
        >
          <span className="flex-1">{tGcal("overlayFailed")}</span>
          <button
            type="button"
            onClick={() => setGcalRetryKey((k) => k + 1)}
            className="btn btn-ghost btn-sm"
          >
            {tGcal("retry")}
          </button>
        </div>
      )}
      <table className="wt-grid animate-grid-in text-xs">
        <thead>
          <tr>
            <th className="sticky-col sticky left-0 z-10 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink">
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
                  colSpan={g.count}
                  className="border-l border-line px-2 py-2.5 text-center text-[11px] font-semibold"
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
  cellLabel: (ms: number) => { primary: string; alt: string | null };
  inHighlight: (ms: number) => boolean;
  now: number | null;
  busyMs: Set<number>;
}) {
  return (
    <tr>
      <td className="sticky-col sticky left-0 z-10 px-3 py-1.5 text-[13px] font-medium text-ink">
        <span className="block max-w-[38vw] truncate md:max-w-none">{label}</span>
      </td>
      {columns.map((c) => {
        const selected = inHighlight(c.ms);
        // UTC 行无国家归属，跳过周末判定（避免兜底 [6,7] 产生无意义高亮）
        const weekend = countryCode ? isWeekendAt(zone, countryCode, c.ms) : false;
        const busy = busyMs.has(c.ms);
        // 当前小时标记（TC-5）：当前时刻落在该列所在的小时区间内。
        // 用区间判定（c.ms <= now < c.ms + 1h）以正确支持半小时/45 分钟偏移时区
        // （Asia/Kolkata、Asia/Kathmandu 等列 ms 不落在 UTC 整点上）。
        // 单元格的视觉状态（热力 / 周末 / 选区 / 现在 / 忙碌）全部由 data-* 属性
        // 驱动 globals.css 的令牌化规则，优先级在那里靠源码顺序保证。
        const isNow = now ? c.ms <= now && now < c.ms + 3600_000 : false;
        const cl = cellLabel(c.ms);
        return (
          <td
            key={c.ms}
            data-zone={zone}
            data-ms={c.ms}
            data-weekend={weekend ? "1" : "0"}
            data-heat={colorByMs[c.ms] ?? ""}
            data-now={isNow ? "1" : "0"}
            data-busy={busy ? "1" : "0"}
            data-selected={selected ? "1" : "0"}
            className="cursor-cell px-1 py-1.5 text-center"
          >
            <span className="tabular-nums">{cl.primary}</span>
            {cl.alt && (
              <span className="block text-[10px] leading-none text-faint tabular-nums">
                {cl.alt}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
