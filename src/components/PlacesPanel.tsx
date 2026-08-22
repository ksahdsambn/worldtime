"use client";

import { memo, useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from "react";
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
import { localCityName } from "@/lib/cityName";
import { useDialog } from "./Dialog";
import { usePresence } from "@/lib/usePresence";
import GlassMenu from "./GlassMenu";
import {
  IconDrag,
  IconHome,
  IconEdit,
  IconClose,
  IconChevronDown,
  IconMore,
  IconBriefcase,
  IconSun,
  IconMoon,
} from "./icons";
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

/** 昼夜状态图标（WC-4），基于三类本地时段细分。
 *  返回 SVG 图标组件（随 currentColor 着色）+ 状态枚举（渲染层翻译为标签）。 */
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

  const nowRaw = useNow(30_000);
  const now = nowRaw ?? 0; // 0 仅 SSR 占位；挂载后 nowRaw 非 null

  // 移动端面板折叠态：手机端默认折叠（避免地点列表霸占网格视口），
  // 桌面端忽略此状态，面板作为常驻侧栏始终展开（由 md:flex 保证）。
  const [mobileOpen, setMobileOpen] = useState(false);

  // 主地点时区（用于偏移量计算）
  const home = places.find((p) => p.id === homeId) ?? null;

  // 拖拽排序（WC-6）：拖拽完成后用 setPlacesOrder 一次性整体回写，
  // 避免多次 splice 抖动。
  const setPlacesOrder = useWorldTimeStore((s) => s.setPlacesOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
    <aside className="animate-slide-in-left flex w-full shrink-0 flex-col border-line bg-surface md:w-80 md:border-r">
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
          <IconChevronDown className="h-4 w-4" />
        </span>
      </button>

      <div
        id="places-panel-content"
        className={`${mobileOpen ? "flex" : "hidden"} flex-col flex-1 bg-surface-inset p-3 md:flex`}
      >
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-faint hidden md:block">
          {t("title")}
        </h2>

        {places.length === 0 && <p className="px-1 text-xs text-faint">{t("empty")}</p>}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={places.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="places-rows space-y-1.5">
              {places.map((p: PlaceItem) => (
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

/** 可拖拽的地点行（WC-6 拖拽排序）——「表盘化」三层布局：
 *  国旗+城市名 ／ 大时钟 ／ 一行状态（昼夜图标 + 相对主地点时差）。
 *
 *  次要信息（国家、IANA 时区、UTC 偏移、夏令时状态与下次切换）全部并入
 *  状态行的 title 悬浮详情；行操作（主地点/重命名/删除）收进行尾 ⋯ 菜单。
 *
 *  用 memo 包裹：父级 places 数组任一变更（如重命名某行）会触发整个列表
 *  重渲染，memo 使仅 props 实际变化的行重渲染。传入的 store action、next-intl 的
 *  t/tCom、useDialog 的 prompt/confirm 均为稳定引用，默认浅比较即可正确跳过。 */
const PlaceRow = memo(function PlaceRow({
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
  // 派生时间信息集中 memo：避免兄弟行变动（如重命名其一）导致本行无谓重算
  // 所有 Luxon / DST 计算。昂贵项（nextDSTChange / timeZoneAbbrev）
  // 已在 lib/time 内部缓存，此处 memo 进一步消除无关重渲染的重复调用。
  const {
    localHour,
    timeStr,
    offsetMin,
    hoverDetail,
  } = useMemo(() => {
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
    // 详情悬浮（6.4）：国家/时区、UTC 偏移、夏令时状态、下次切换日期。
    // 行面只保留「时差」一个数字，其余专业细节都收进这条 tooltip。
    const dst = isDST(p.timeZone, now);
    const utcOffset = offsetMinutes(p.timeZone, now);
    const nextChange = nextDSTChange(p.timeZone, now);
    const dstWarn = dstChangeWithinDays(p.timeZone, 7, now);
    const hoverDetail = [
      `${p.countryZh} · ${p.timeZone}`,
      `UTC${formatOffset(utcOffset)}`,
      `${t("dst")}: ${dst ? t("yes") : t("no")}${timeZoneAbbrev(p.timeZone, now) ? ` (${timeZoneAbbrev(p.timeZone, now)})` : ""}`,
      nextChange
        ? `${t("nextChange")}: ${DateTime.fromMillis(nextChange, { zone: p.timeZone }).toFormat("yyyy-MM-dd")}`
        : t("noUpcoming"),
      ...(dstWarn ? [t("dstWarnSoon")] : []),
    ].join("\n");
    return { localHour, timeStr, offsetMin, hoverDetail };
    // t 入 next-intl 稳定；place/home 为引用，变更时本行确需重算
  }, [now, nowRaw, p, hourFormat, home, t]);

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
      className={`surface group animate-fade-in overflow-hidden transition-shadow duration-200 hover:shadow-glow ${
        isHome ? "home-row" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-2.5 py-2.5">
        {/* 拖拽手柄（WC-6）：桌面悬停显现，触屏常驻（弱化）以保留拖拽排序 */}
        <button
          type="button"
          aria-label={t("dragHandle")}
          className="icon-btn cursor-grab text-faint opacity-60 transition-opacity duration-150 active:cursor-grabbing md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          {...attributes}
          {...listeners}
        >
          <IconDrag className="h-4 w-4" />
        </button>
        <span className="text-xl leading-none" aria-hidden>
          {p.flag}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink">
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
          {/* 状态行：昼夜图标 + 相对主地点时差；完整时区细节在 title 悬浮 */}
          <div
            className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint"
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
                <span className="text-faint" aria-label={label}>
                  <dn.Icon className="h-3.5 w-3.5" />
                </span>
              );
            })()}
            {offsetMin != null && (
              <span data-testid={`offset-${p.id}`}>
                {offsetMin === 0 ? "0" : formatOffset(offsetMin)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="chrono text-xl text-ink" data-testid={`clock-${p.id}`}>
            {timeStr}
          </span>
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
      </div>
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
