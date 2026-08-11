"use client";

import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";

/**
 * 任意日期跳转（TC-6）。
 * 选择一个日期后，网格以该日期为起始日重新渲染。
 * 输入框为受控组件，其值由 viewStartDateMs（主地点本地）派生，
 * 保证 UI 与 store 状态一致（重置时输入框同步清空）。
 */
export default function DateJump() {
  const t = useTranslations("DateJump");
  const setViewStartDate = useWorldTimeStore((s) => s.setViewStartDate);
  const viewStartDateMs = useWorldTimeStore((s) => s.viewStartDateMs);
  const places = useWorldTimeStore((s) => s.places);
  const homeId = useWorldTimeStore((s) => s.homeId);
  const home = places.find((p) => p.id === homeId) ?? places[0];

  // 受控值：由 viewStartDateMs 在主地点本地时区下格式化为 yyyy-MM-dd
  const value =
    home && viewStartDateMs != null
      ? DateTime.fromMillis(viewStartDateMs, { zone: home.timeZone }).toFormat(
          "yyyy-MM-dd",
        )
      : "";

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!home) return;
    const v = e.target.value; // yyyy-MM-dd
    if (!v) {
      setViewStartDate(null);
      return;
    }
    const dt = DateTime.fromISO(v, { zone: home.timeZone }).startOf("day");
    if (dt.isValid) setViewStartDate(dt.toMillis());
  }

  function reset() {
    setViewStartDate(null);
  }

  return (
    <label className="flex items-center gap-1 text-xs text-gray-600">
      <span>{t("jumpTo")}：</span>
      <input
        type="date"
        value={value}
        onChange={onChange}
        data-testid="date-jump"
        className="border rounded px-1 py-0.5 text-xs"
      />
      <button
        type="button"
        onClick={reset}
        className="rounded border px-1.5 py-0.5 text-xs hover:bg-gray-100"
      >
        {t("today")}
      </button>
    </label>
  );
}
