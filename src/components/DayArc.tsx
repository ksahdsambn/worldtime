import { classifyLocalPeriod, type LocalPeriod } from "@/lib/time";
import type { DayPeriods } from "@/store/useWorldTimeStore";

const PERIOD_TOKEN: Record<LocalPeriod, string> = {
  work: "var(--heat-good)",
  contact: "var(--heat-caution)",
  rest: "var(--heat-bad)",
};

/**
 * 24 小时日弧：一条色带画出工作 / 可联系 / 休息，针标当前本地小时。
 * 纯装饰（aria-hidden）；时段语义由卡片上的文字标签承担。
 */
export default function DayArc({
  hour,
  periods,
}: {
  hour: number;
  periods: DayPeriods;
}) {
  const stops: string[] = [];
  for (let h = 0; h < 24; h++) {
    const color = PERIOD_TOKEN[classifyLocalPeriod(h, periods)];
    const a = (h / 24) * 100;
    const b = ((h + 1) / 24) * 100;
    stops.push(`${color} ${a}% ${b}%`);
  }
  const clamped = ((hour % 24) + 24) % 24;
  return (
    <div className="day-arc" aria-hidden>
      <div
        className="day-arc__track"
        style={{ backgroundImage: `linear-gradient(to right, ${stops.join(", ")})` }}
      />
      <span
        className="day-arc__now"
        style={{ left: `${((clamped + 0.5) / 24) * 100}%` }}
      />
    </div>
  );
}
