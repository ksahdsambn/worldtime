"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWorldTimeStore, type PlaceItem, type DayPeriods } from "@/store/useWorldTimeStore";
import { useNow } from "@/lib/useNow";
import AnalogClock from "@/components/AnalogClock";
import { getLatLng } from "@/data/latlng";
import { sunRiseSet } from "@/lib/sun";
import {
  classifyLocalPeriod,
  type LocalPeriod,
  diffOffsetMinutes,
  formatOffset,
  formatClock,
  isDST,
  timeZoneAbbrev,
  dstChangeWithinDays,
  offsetMinutes,
  nextDSTChange,
} from "@/lib/time";

/** 昼夜状态图标（WC-4），基于三类本地时段细分。 */
function dayNightIcon(
  localHour: number,
  periods: DayPeriods,
): { icon: string; state: LocalPeriod } {
  const state = classifyLocalPeriod(localHour, periods);
  switch (state) {
    case "work":
      return { icon: "💼", state }; // 工作时段
    case "contact":
      return { icon: "🌤️", state }; // 可联系时段（早晚）
    case "rest":
      return { icon: "🌙", state }; // 休息 / 睡眠时段
  }
}

export default function PlacesPanel() {
  const t = useTranslations("Places");
  const tCom = useTranslations("Common");
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const removePlace = useWorldTimeStore((s) => s.removePlace);
  const setHome = useWorldTimeStore((s) => s.setHome);
  const hourFormat = useWorldTimeStore((s) => s.hourFormat);
  const dayPeriods = useWorldTimeStore((s) => s.dayPeriods);
  const renamePlace = useWorldTimeStore((s) => s.renamePlace);
  const setPlaceTags = useWorldTimeStore((s) => s.setPlaceTags);
  const activeTag = useWorldTimeStore((s) => s.activeTag);
  const setActiveTag = useWorldTimeStore((s) => s.setActiveTag);
  // 直接从 places 派生标签，避免每次 render 返回新数组导致无限更新
  const allTags = useMemo(
    () => Array.from(new Set(places.flatMap((p) => p.tags))),
    [places],
  );

  const nowRaw = useNow(30_000);
  const now = nowRaw ?? 0; // 0 仅 SSR 占位；挂载后 nowRaw 非 null

  // 主地点时区（用于偏移量计算）
  const home = places.find((p) => p.id === homeId) ?? null;

  // UTC 当前时间（固定显示，不随主地点变化 WC-7）
  const utcStr = nowRaw
    ? DateTime.fromMillis(nowRaw, { zone: "UTC" }).toFormat("HH:mm")
    : "--:--";

  // 拖拽排序（WC-6）：按激活标签筛选后的列表参与排序，
  // 拖拽完成后用 setPlacesOrder 一次性整体回写，避免多次 splice 抖动。
  const setPlacesOrder = useWorldTimeStore((s) => s.setPlacesOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // 当前展示的地点（按标签筛选）
  const visiblePlaces = useMemo(
    () =>
      places.filter(
        (p: PlaceItem) => activeTag === null || p.tags.includes(activeTag),
      ),
    [places, activeTag],
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // 以全量 places 的 id 序列参与重排，保证未筛选项位置不变
    const ids = places.map((p) => p.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    setPlacesOrder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <aside className="w-full md:w-72 shrink-0 border-r p-3">
      {/* UTC 基准行（WC-7）：固定在列表顶部，仅作参考 */}
      <div className="mb-2 flex items-center justify-between rounded border bg-gray-50 px-2 py-1 text-xs">
        <span className="text-gray-600">UTC · {t("utcRow")}</span>
        <span className="font-mono font-semibold text-gray-900 tabular-nums" data-testid="utc-clock">
          {utcStr}
        </span>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-gray-700">{t("title")}</h2>

      {/* 标签筛选（6.5） */}
      {allTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`rounded px-1.5 py-0.5 ${activeTag === null ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {t("all")}
          </button>
          {allTags.map((tg) => (
            <button
              key={tg}
              type="button"
              onClick={() => setActiveTag(activeTag === tg ? null : tg)}
              className={`rounded px-1.5 py-0.5 ${activeTag === tg ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              #{tg}
            </button>
          ))}
        </div>
      )}

      {places.length === 0 && (
        <p className="text-xs text-gray-500">{t("empty")}</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={visiblePlaces.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1">
            {visiblePlaces.map((p: PlaceItem) => (
              <PlaceRow
                key={p.id}
                place={p}
                isHome={p.id === homeId}
                now={now}
                nowRaw={nowRaw}
                hourFormat={hourFormat}
                dayPeriods={dayPeriods}
                home={home}
                t={t}
                tCom={tCom}
                onSetHome={setHome}
                onRemove={removePlace}
                onRename={renamePlace}
                onTags={setPlaceTags}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </aside>
  );
}

/** 可拖拽的地点行（WC-6 拖拽排序）。 */
function PlaceRow({
  place,
  isHome,
  now,
  nowRaw,
  hourFormat,
  dayPeriods,
  home,
  t,
  tCom,
  onSetHome,
  onRemove,
  onRename,
  onTags,
}: {
  place: PlaceItem;
  isHome: boolean;
  now: number;
  nowRaw: number | null;
  hourFormat: "12" | "24" | "mixed";
  dayPeriods: DayPeriods;
  home: PlaceItem | null;
  t: (k: string) => string;
  tCom: (k: string) => string;
  onSetHome: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onTags: (id: string, tags: string[]) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.id });

  const p = place;
  const dt = DateTime.fromMillis(now, { zone: p.timeZone });
  const localHour = dt.hour;
  const timeStr = nowRaw
    ? formatClock(p.timeZone, nowRaw, hourFormat, p.countryCode)
    : "--:--";
  // 与主地点的偏移（分钟），仅当存在主地点且非主地点自身时计算（TC-7）
  const offsetMin =
    home && p.id !== home.id
      ? diffOffsetMinutes(home.timeZone, p.timeZone, now)
      : null;
  const dst = isDST(p.timeZone, now); // TC-8
  const abbr = timeZoneAbbrev(p.timeZone, now);
  // DST 预警（6.3）：7 天内将切换则提示
  const dstWarn = dstChangeWithinDays(p.timeZone, 7, now);
  // 详情悬浮（6.4）：UTC 偏移、当前是否夏令时、下次切换日期
  const utcOffset = offsetMinutes(p.timeZone, now);
  const nextChange = nextDSTChange(p.timeZone, now);
  const hoverDetail = [
    `UTC${formatOffset(utcOffset)}`,
    `${t("dst")}: ${dst ? t("yes") : t("no")}`,
    nextChange
      ? `${t("nextChange")}: ${DateTime.fromMillis(nextChange, { zone: p.timeZone }).toFormat("yyyy-MM-dd")}`
      : t("noUpcoming"),
  ].join("\n");
  // 日出日落（6.7）：仅对收录经纬度的城市计算
  const ll = getLatLng(p.id);
  const sun = nowRaw && ll ? sunRiseSet(ll.lat, ll.lng, p.timeZone, nowRaw) : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded border px-2 py-1.5 text-sm ${
        isHome ? "border-blue-400 bg-blue-50" : "bg-white"
      }`}
    >
      {/* 拖拽手柄（WC-6） */}
      <button
        type="button"
        aria-label={t("dragHandle")}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 px-0.5"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="text-lg" aria-hidden>
        {p.flag}
      </span>
      <AnalogClock timeZone={p.timeZone} now={now} size={36} />
      <span className="flex-1">
        <span className="font-medium text-black">
          {p.customName || p.nameZh}
        </span>
        {isHome && (
          <span className="ml-1 rounded bg-blue-100 px-1 text-[10px] text-blue-700">
            {t("home")}
          </span>
        )}
        {p.tags.length > 0 && (
          <span className="ml-1 text-[10px] text-gray-400">
            {p.tags.map((tg) => `#${tg}`).join(" ")}
          </span>
        )}
        <span className="block text-[11px] text-gray-500">
          {p.countryZh} · {p.timeZone}
        </span>
        {sun && (sun.rise || sun.set) && (
          <span
            className="block text-[10px] text-gray-400"
            data-testid={`sun-${p.id}`}
          >
            🌅 {sun.rise ? sun.rise.toFormat("HH:mm") : t("sunNone")}
            {" / "}
            🌇 {sun.set ? sun.set.toFormat("HH:mm") : t("sunNone")}
          </span>
        )}
      </span>
      {(() => {
        const dn = dayNightIcon(localHour, dayPeriods);
        return (
          <span
            className="text-base"
            title={dn.state}
            aria-label={dn.state}
          >
            {dn.icon}
          </span>
        );
      })()}
      <div className="flex flex-col items-end leading-tight">
        {offsetMin != null && (
          <span
            className="font-mono text-[11px] text-gray-600 cursor-help"
            data-testid={`offset-${p.id}`}
            title={hoverDetail}
          >
            {offsetMin === 0 ? "0" : formatOffset(offsetMin)}
          </span>
        )}
        {abbr && (
          <span
            className={`text-[10px] ${dst ? "text-orange-600 font-semibold" : "text-gray-400"}`}
            data-testid={`abbr-${p.id}`}
            title={hoverDetail}
          >
            {abbr}
          </span>
        )}
        {dstWarn && (
          <span
            className="text-[9px] rounded bg-yellow-200 text-yellow-800 px-1"
            data-testid={`dst-warn-${p.id}`}
            title={t("dstWarnSoon")}
          >
            DST!
          </span>
        )}
      </div>
      <span
        className="w-16 text-right font-mono font-semibold tabular-nums"
        data-testid={`clock-${p.id}`}
      >
        {timeStr}
      </span>
      <button
        type="button"
        onClick={() => onSetHome(p.id)}
        className="rounded px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100"
        title={t("setHome")}
        aria-label={t("setHome")}
      >
        ⌂
      </button>
      <button
        type="button"
        onClick={() => {
          const name = window.prompt(t("renamePrompt"), p.customName || p.nameZh);
          if (name !== null) onRename(p.id, name);
        }}
        className="rounded px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100"
        title={t("rename")}
        aria-label={t("rename")}
      >
        ✎
      </button>
      <button
        type="button"
        onClick={() => {
          const tagsStr = window.prompt(t("tagsPrompt"), p.tags.join(", "));
          if (tagsStr !== null) {
            onTags(
              p.id,
              tagsStr
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            );
          }
        }}
        className="rounded px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100"
        title={t("tags")}
        aria-label={t("tags")}
      >
        #
      </button>
      <button
        type="button"
        onClick={() => {
          // 删除主地点前二次确认，避免误删基准地点
          if (isHome && !window.confirm(t("confirmRemoveHome"))) return;
          onRemove(p.id);
        }}
        className="rounded px-1.5 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
        title={tCom("delete")}
        aria-label={tCom("delete")}
      >
        ✕
      </button>
    </li>
  );
}
