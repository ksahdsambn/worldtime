"use client";

import { memo, useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from "react";
import { useLocale, useTranslations } from "next-intl";
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
import { localCityName, cityCountryName } from "@/lib/cityName";
import { useDialog } from "./Dialog";
import { usePresence } from "@/lib/usePresence";
import GlassMenu from "./GlassMenu";
import {
  IconDrag,
  IconHome,
  IconEdit,
  IconClose,
  IconMore,
  IconBriefcase,
  IconSun,
  IconMoon,
} from "./icons";
import DayArc from "./DayArc";
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
): { Icon: ComponentType<SVGProps<SVGSVGElement>>; state: LocalPeriod } {
  const state = classifyLocalPeriod(localHour, periods);
  switch (state) {
    case "work":
      return { Icon: IconBriefcase, state }; // 工作时段
    case "contact":
      return { Icon: IconSun, state }; // 可联系时段（早晚）
    case "rest":
      return { Icon: IconMoon, state }; // 休息 / 睡眠时段
  }
}

/**
 * 时间卡列表：首页默认「时钟」视图。
 *
 * 每座城市一张横向卡片——城市名 + 大号本地时间（精确到分钟）+ 日期星期 +
 * 昼夜状态 + 相对主地点时差，直接回答「此刻 / 任意时刻，各地几点」。
 * 显示时刻统一取 pinnedMs（自定义查看时刻），未固定则实时走表。
 *
 * 地点管理原位内建：拖拽排序（@dnd-kit）、行尾 ⋯ 菜单（主地点/重命名/删除），
 * 取代旧的左侧独立面板，首页由三栏收敛为单列卡片流。
 */
export default function TimeCards() {
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
  const pinnedMs = useWorldTimeStore((s) => s.pinnedMs);

  // 实时节拍（30s）；被固定时改用 pinnedMs，走表停摆
  const nowRaw = useNow(30_000);
  const now = nowRaw ?? 0; // 0 仅 SSR 占位；挂载后 nowRaw 非 null
  const viewingMs = pinnedMs ?? now;

  // 主地点（用于偏移量计算，TC-7）
  const home = places.find((p) => p.id === homeId) ?? null;

  // 拖拽排序（WC-6）：拖拽完成后用 setPlacesOrder 一次性整体回写
  const setPlacesOrder = useWorldTimeStore((s) => s.setPlacesOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = places.map((p) => p.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    setPlacesOrder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <section aria-label={t("title")} className="min-h-0 flex-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={places.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <ul className="time-cards mx-auto w-full space-y-3 px-3 pb-12 pt-3 md:px-4 md:pt-4">
            {places.map((p: PlaceItem) => (
              <PlaceCardRow
                key={p.id}
                place={p}
                isHome={p.id === homeId}
                viewingMs={viewingMs}
                hourFormat={hourFormat}
                dayPeriods={dayPeriods}
                home={home}
                locale={locale}
                t={t}
                tCom={tCom}
                onSetHome={setHome}
                onRemove={removePlace}
                onRename={renamePlace}
                prompt={prompt}
                confirm={confirm}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {dialog}
    </section>
  );
}

/**
 * 可拖拽的时间卡行。
 *
 * 用 memo 包裹：父级 places 数组任一变更会触发整个列表重渲染，memo 使仅
 * props 实际变化的行重渲染。传入的 store action、next-intl 的 t/tCom、
 * useDialog 的 prompt/confirm 均为稳定引用，默认浅比较即可正确跳过。
 */
const PlaceCardRow = memo(function PlaceCardRow({
  place,
  isHome,
  viewingMs,
  hourFormat,
  dayPeriods,
  home,
  locale,
  t,
  tCom,
  onSetHome,
  onRemove,
  onRename,
  prompt,
  confirm,
}: {
  place: PlaceItem;
  isHome: boolean;
  viewingMs: number;
  hourFormat: "12" | "24" | "mixed";
  dayPeriods: DayPeriods;
  home: PlaceItem | null;
  locale: AppLocale;
  t: (k: string) => string;
  tCom: (k: string) => string;
  onSetHome: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
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
  // 派生时间信息集中 memo：兄弟行变动不触发本行重算 Luxon / DST。
  // 昂贵项（nextDSTChange / timeZoneAbbrev）已在 lib/time 内部缓存。
  const { localHour, timeStr, dateStr, offsetMin, hoverDetail } = useMemo(() => {
    const dt = DateTime.fromMillis(viewingMs, { zone: p.timeZone }).setLocale(locale);
    const localHour = dt.hour;
    // 水合前占位（viewingMs=0 为 SSR/首帧哨兵值）：与旧面板一致的 --:--
    const hasTime = viewingMs > 0;
    // 大号时钟：精确到分钟（12/24 制随设置与地区惯例）
    const timeStr = hasTime ? formatClock(p.timeZone, viewingMs, hourFormat, p.countryCode) : "--:--";
    // 日期 + 星期（随 locale 本地化；被固定时刻跨日时此处如实显示该日）
    const dateStr = hasTime ? dt.toFormat("MM-dd EEE") : "—";
    // 与主地点的偏移（分钟），仅当存在主地点且非主地点自身时计算（TC-7）
    const offsetMin =
      home && p.id !== home.id
        ? diffOffsetMinutes(home.timeZone, p.timeZone, viewingMs)
        : null;
    // 详情悬浮（6.4）：国家/时区、UTC 偏移、夏令时状态、下次切换日期。
    const dst = isDST(p.timeZone, viewingMs);
    const utcOffset = offsetMinutes(p.timeZone, viewingMs);
    const nextChange = nextDSTChange(p.timeZone, viewingMs);
    const dstWarn = dstChangeWithinDays(p.timeZone, 7, viewingMs);
    const hoverDetail = [
      `${cityCountryName(locale, p)} · ${p.timeZone}`,
      `UTC${formatOffset(utcOffset)}`,
      `${t("dst")}: ${dst ? t("yes") : t("no")}${timeZoneAbbrev(p.timeZone, viewingMs) ? ` (${timeZoneAbbrev(p.timeZone, viewingMs)})` : ""}`,
      nextChange
        ? `${t("nextChange")}: ${DateTime.fromMillis(nextChange, { zone: p.timeZone }).toFormat("yyyy-MM-dd")}`
        : t("noUpcoming"),
      ...(dstWarn ? [t("dstWarnSoon")] : []),
    ].join("\n");
    return { localHour, timeStr, dateStr, offsetMin, hoverDetail };
  }, [viewingMs, p, hourFormat, home, locale, t]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: `${transition ? transition + ", " : ""}scale var(--dur-fast) var(--ease-out-quint), box-shadow var(--dur-fast) var(--ease-out-quint)`,
    opacity: isDragging ? 0.5 : 1,
    scale: isDragging ? "1.02" : "1",
    boxShadow: isDragging ? "var(--shadow-lg)" : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`time-card surface group animate-fade-in rounded-lg px-3 py-3 shadow-sm transition-shadow duration-200 md:px-4 md:py-3.5 ${
        isHome ? "home-row time-card--home" : ""
      }`}
    >
      <div className="time-card__row">
        <button
          type="button"
          aria-label={t("dragHandle")}
          className="icon-btn cursor-grab text-faint opacity-60 transition-opacity duration-150 active:cursor-grabbing md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          {...attributes}
          {...listeners}
        >
          <IconDrag className="h-4 w-4" />
        </button>
        <span className="text-2xl leading-none" aria-hidden>
          {p.flag}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold tracking-tight text-ink">
            {isHome && (
              <>
                <span className="sr-only">{t("home")}</span>
                <IconHome
                  aria-hidden
                  className="mr-1 inline h-3.5 w-3.5 shrink-0 text-warm-strong"
                />
              </>
            )}
            {p.customName || localCityName(locale, p)}
          </div>
          <div
            className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-faint"
            title={hoverDetail}
          >
            {(() => {
              const dn = dayNightIcon(localHour, dayPeriods);
              const label =
                dn.state === "work"
                  ? t("periodWork")
                  : dn.state === "contact"
                    ? t("periodContact")
                    : t("periodRest");
              return (
                <span className={`period-chip period-chip--${dn.state}`} aria-label={label}>
                  <dn.Icon className="h-3 w-3" aria-hidden />
                  {label}
                </span>
              );
            })()}
            {offsetMin != null && (
              <span data-testid={`offset-${p.id}`} className="chrono text-[12px] text-muted">
                {formatOffset(offsetMin)}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="chrono time-card__clock"
            data-testid={`clock-${p.id}`}
          >
            {timeStr}
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-faint">{dateStr}</div>
        </div>
        <PlaceActionsMenu
          place={p}
          isHome={isHome}
          locale={locale}
          t={t}
          tCom={tCom}
          onSetHome={onSetHome}
          onRemove={onRemove}
          onRename={onRename}
          prompt={prompt}
          confirm={confirm}
        />
      </div>
      <DayArc hour={localHour} periods={dayPeriods} />
    </li>
  );
});

/** 行尾 ⋯ 操作菜单：主地点 / 重命名 / 删除 三个低频操作的收纳处。
 *  桌面悬停行时显现，触屏常驻（弱化）。Esc / 外部点击关闭，焦点还给按钮。 */
function PlaceActionsMenu({
  place,
  isHome,
  locale,
  t,
  tCom,
  onSetHome,
  onRemove,
  onRename,
  prompt,
  confirm,
}: {
  place: PlaceItem;
  isHome: boolean;
  locale: AppLocale;
  t: (k: string) => string;
  tCom: (k: string) => string;
  onSetHome: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
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
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const presence = usePresence(open, 200);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !btnRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  async function onRemoveClick() {
    setOpen(false);
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
    onRemove(place.id);
  }

  async function onRenameClick() {
    setOpen(false);
    const name = await prompt({
      title: t("renamePrompt"),
      defaultValue: place.customName || localCityName(locale, place),
    });
    if (name !== null) onRename(place.id, name);
  }

  const itemCls =
    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={tCom("more")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={tCom("more")}
        onClick={() => setOpen((o) => !o)}
        data-testid={`place-menu-${place.id}`}
        className="icon-btn !h-6 !w-6 opacity-60 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      >
        <IconMore className="h-4 w-4" />
      </button>

      {presence.mounted && (
        <GlassMenu
          ref={panelRef}
          anchorRef={btnRef}
          align="end"
          width={176}
          data-state={presence.state}
          role="menu"
          aria-label={tCom("more")}
          className="motion-pop p-1.5"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSetHome(place.id);
            }}
            disabled={isHome}
            aria-disabled={isHome}
            className={`${itemCls} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <IconHome className="h-3.5 w-3.5" />
            {t("setHome")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onRenameClick}
            className={itemCls}
          >
            <IconEdit className="h-3.5 w-3.5" />
            {t("rename")}
          </button>
          <div className="my-1 h-px bg-[var(--border)]" />
          <button
            type="button"
            role="menuitem"
            onClick={onRemoveClick}
            className={`${itemCls} hover:!text-danger`}
          >
            <IconClose className="h-3.5 w-3.5" />
            {tCom("delete")}
          </button>
        </GlassMenu>
      )}
    </>
  );
}
