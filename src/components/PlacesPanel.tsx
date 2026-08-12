"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { getLatLng } from "@/data/latlng";
import { sunRiseSet } from "@/lib/sun";
import { localCityName } from "@/lib/cityName";
import { useDialog } from "./Dialog";
import type { AppLocale } from "@/i18n/routing";
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
  const locale = useLocale() as AppLocale;
  // 应用内 prompt/confirm 对话框：替代 window.prompt/confirm（移动端体验更佳）
  const { prompt, confirm, dialog } = useDialog(tCom("cancel"), tCom("confirm"));
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

  // 移动端面板折叠态：手机端默认折叠（避免地点列表霸占网格视口），
  // 桌面端忽略此状态，面板作为常驻侧栏始终展开（由 md:flex 保证）。
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <aside className="animate-fade-in flex w-full shrink-0 flex-col border-line bg-surface md:w-72 md:border-r">
      {/* 移动端折叠开关：桌面端面板常驻展开，手机端默认折叠，把视口让给网格 */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-controls="places-panel-content"
        className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 md:hidden"
      >
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            {t("title")}
          </span>
          <span className="chip">{places.length}</span>
        </span>
        <span
          aria-hidden
          className={`text-faint transition-transform duration-150 ${
            mobileOpen ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      <div
        id="places-panel-content"
        className={`${mobileOpen ? "flex" : "hidden"} flex-col p-3 md:flex`}
      >
        {/* UTC 基准行（WC-7）：固定在列表顶部，仅作参考 */}
        <div className="surface mb-3 flex items-center justify-between px-3 py-2">
          <span className="text-[11px] uppercase tracking-wide text-faint">
            UTC · {t("utcRow")}
          </span>
          <span
            className="font-mono text-sm font-semibold tabular-nums text-ink"
            data-testid="utc-clock"
          >
            {utcStr}
          </span>
        </div>

        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-faint hidden md:block">
          {t("title")}
        </h2>

        {/* 标签筛选（6.5） */}
        {allTags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`chip cursor-pointer transition-colors ${
                activeTag === null
                  ? "!bg-ink !text-app"
                  : "hover:!bg-surface-hover"
              }`}
            >
              {t("all")}
            </button>
            {allTags.map((tg) => (
              <button
                key={tg}
                type="button"
                onClick={() => setActiveTag(activeTag === tg ? null : tg)}
                className={`chip cursor-pointer transition-colors ${
                  activeTag === tg
                    ? "!bg-accent !text-accent-fg !border-accent"
                    : "hover:!bg-surface-hover"
                }`}
              >
                #{tg}
              </button>
            ))}
          </div>
        )}

        {places.length === 0 && <p className="px-1 text-xs text-faint">{t("empty")}</p>}

        {/* 标签筛选把所有城市过滤掉了：给明确空状态 + 清除筛选，避免空白列表 */}
        {places.length > 0 && visiblePlaces.length === 0 && activeTag && (
          <div className="px-1 py-2 text-xs text-muted">
            <p className="mb-1.5">{t("emptyFiltered", { tag: activeTag })}</p>
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="btn-ghost btn-sm"
            >
              {t("clearFilter")}
            </button>
          </div>
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
            <ul className="places-rows space-y-1.5">
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
                  locale={locale}
                  t={t}
                  tCom={tCom}
                  onSetHome={setHome}
                  onRemove={removePlace}
                  onRename={renamePlace}
                  onTags={setPlaceTags}
                  prompt={prompt}
                  confirm={confirm}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      {dialog}
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
  locale,
  t,
  tCom,
  onSetHome,
  onRemove,
  onRename,
  onTags,
  prompt,
  confirm,
}: {
  place: PlaceItem;
  isHome: boolean;
  now: number;
  nowRaw: number | null;
  hourFormat: "12" | "24" | "mixed";
  dayPeriods: DayPeriods;
  home: PlaceItem | null;
  locale: AppLocale;
  t: (k: string) => string;
  tCom: (k: string) => string;
  onSetHome: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onTags: (id: string, tags: string[]) => void;
  prompt: (opts: {
    title: string;
    defaultValue?: string;
    placeholder?: string;
  }) => Promise<string | null>;
  confirm: (opts: {
    title: string;
    message?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
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
    // 保留 dnd-kit 的排序过渡；额外加上 scale/box-shadow 过渡用于拖拽抬升反馈
    transition: `${transition ? transition + ", " : ""}scale var(--dur-fast) var(--ease-out-quint), box-shadow var(--dur-fast) var(--ease-out-quint)`,
    opacity: isDragging ? 0.5 : 1,
    // 拖拽抬升：用独立的 scale 属性（与 dnd-kit 的 transform 叠加，不冲突）+ 加深阴影，
    // 给「被拎起」的实体感。scale 属性旧浏览器忽略，退化为仅阴影。
    scale: isDragging ? "1.02" : "1",
    boxShadow: isDragging ? "var(--shadow-lg)" : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`surface group animate-fade-in overflow-hidden transition-shadow duration-150 hover:shadow-md ${
        isHome ? "bg-warm-soft" : "bg-surface"
      }`}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        {/* 拖拽手柄（WC-6） */}
        <button
          type="button"
          aria-label={t("dragHandle")}
          className="icon-btn cursor-grab text-faint active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <span className="text-xl leading-none" aria-hidden>
          {p.flag}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isHome && <span className="sr-only">{t("home")}</span>}
            <span className="truncate text-[13px] font-medium text-ink">
              {isHome && (
                <span aria-hidden className="text-warm-strong">
                  ⌂{" "}
                </span>
              )}
              {p.customName || localCityName(locale, p)}
            </span>
          </div>
          <div className="truncate text-[11px] text-faint">
            {p.countryZh} · {p.timeZone}
            {p.tags.length > 0 && (
              <span className="ml-1">
                {" "}
                {p.tags.map((tg) => `#${tg}`).join(" ")}
              </span>
            )}
          </div>
          {sun && (sun.rise || sun.set) && (
            <div className="text-[10px] text-faint" data-testid={`sun-${p.id}`}>
              🌅 {sun.rise ? sun.rise.toFormat("HH:mm") : t("sunNone")} {" / "} 🌇{" "}
              {sun.set ? sun.set.toFormat("HH:mm") : t("sunNone")}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end leading-tight">
          <span
            className="font-mono text-sm font-semibold tabular-nums text-ink"
            data-testid={`clock-${p.id}`}
          >
            {timeStr}
          </span>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
            {(() => {
              const dn = dayNightIcon(localHour, dayPeriods);
              return (
                <span className="text-xs" title={dn.state} aria-label={dn.state}>
                  {dn.icon}
                </span>
              );
            })()}
            {offsetMin != null && (
              <span
                className="cursor-help text-faint"
                data-testid={`offset-${p.id}`}
                title={hoverDetail}
              >
                {offsetMin === 0 ? "0" : formatOffset(offsetMin)}
              </span>
            )}
            {abbr && (
              <span
                className={`font-medium ${dst ? "text-warm-strong" : "text-faint"}`}
                data-testid={`abbr-${p.id}`}
                title={hoverDetail}
              >
                {abbr}
              </span>
            )}
            {dstWarn && (
              <span
                className="rounded-full bg-warm-soft px-1 text-[9px] font-semibold text-warm-strong"
                data-testid={`dst-warn-${p.id}`}
                title={t("dstWarnSoon")}
              >
                {t("dstBadge")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 操作行 */}
      <div className="flex items-center justify-end gap-1 border-t border-line px-2 py-1 md:gap-0.5 md:px-1.5">
        <button
          type="button"
          onClick={() => onSetHome(p.id)}
          className="icon-btn h-9 w-9 text-[13px] md:!h-6 md:!w-6 md:text-[12px]"
          title={t("setHome")}
          aria-label={t("setHome")}
        >
          ⌂
        </button>
        <button
          type="button"
          onClick={async () => {
            const name = await prompt({
              title: t("renamePrompt"),
              defaultValue: p.customName || localCityName(locale, p),
            });
            if (name !== null) onRename(p.id, name);
          }}
          className="icon-btn h-9 w-9 text-[13px] md:!h-6 md:!w-6 md:text-[12px]"
          title={t("rename")}
          aria-label={t("rename")}
        >
          ✎
        </button>
        <button
          type="button"
          onClick={async () => {
            const tagsStr = await prompt({
              title: t("tagsPrompt"),
              defaultValue: p.tags.join(", "),
            });
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
          className="icon-btn h-9 w-9 text-[13px] md:!h-6 md:!w-6 md:text-[12px]"
          title={t("tags")}
          aria-label={t("tags")}
        >
          #
        </button>
        <button
          type="button"
          onClick={async () => {
            // 删除主地点前二次确认，避免误删基准地点
            if (
              isHome &&
              !(await confirm({
                title: t("remove"),
                message: t("confirmRemoveHome"),
                destructive: true,
              }))
            )
              return;
            onRemove(p.id);
          }}
          className="icon-btn h-9 w-9 text-[13px] md:!h-6 md:!w-6 md:text-[12px] hover:!text-red-500"
          title={tCom("delete")}
          aria-label={tCom("delete")}
        >
          ✕
        </button>
      </div>
    </li>
  );
}
