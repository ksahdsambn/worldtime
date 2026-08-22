"use client";

import { useTranslations } from "next-intl";
import { DateTime } from "luxon";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";

/**
 * 任意日期跳转输入框（TC-6）——渲染于「视图选项」弹层内。
 *
 * 选择一个日期后，网格以该日期为起始日重新渲染。清空即回到今天。
 * 输入框为受控组件，其值由 viewStartDateMs（主地点本地）派生，
 * 保证 UI 与 store 状态一致。「今天 / 回到现在」合并为主工具条的 NowButton。
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

  // 无地点时禁用日期选择器：原实现输入框仍可交互但 onChange 静默丢弃输入。
  const disabled = !home;

  return (
    <input
      type="date"
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={t("jumpTo")}
      data-testid="date-jump"
      className="input !w-auto text-xs disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
