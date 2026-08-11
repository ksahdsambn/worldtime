"use client";

import { DateTime } from "luxon";

/**
 * 指针式模拟时钟（WC-3）。
 * 实时反映目标时区的当前时间，指针角度：
 * - 时针：(hour%12 + minute/60) * 30°
 * - 分针：minute * 6°
 */
export default function AnalogClock({
  timeZone,
  now,
  size = 40,
}: {
  timeZone: string;
  now: number;
  size?: number;
}) {
  const dt = DateTime.fromMillis(now, { zone: timeZone });
  if (!now || !dt.isValid) return null;
  const h = dt.hour;
  const m = dt.minute;
  const hourAngle = ((h % 12) + m / 60) * 30;
  const minAngle = m * 6;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={dt.toFormat("HH:mm")}
      data-testid="analog-clock"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="white"
        stroke="#9ca3af"
        strokeWidth={1}
      />
      {/* 时针 */}
      <line
        x1={cx}
        y1={cy}
        x2={cx}
        y2={cy - r * 0.5}
        stroke="#1f2937"
        strokeWidth={2}
        strokeLinecap="round"
        transform={`rotate(${hourAngle} ${cx} ${cy})`}
      />
      {/* 分针 */}
      <line
        x1={cx}
        y1={cy}
        x2={cx}
        y2={cy - r * 0.75}
        stroke="#374151"
        strokeWidth={1.5}
        strokeLinecap="round"
        transform={`rotate(${minAngle} ${cx} ${cy})`}
      />
      <circle cx={cx} cy={cy} r={1.5} fill="#1f2937" />
    </svg>
  );
}
