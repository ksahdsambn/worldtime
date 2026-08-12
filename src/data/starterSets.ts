import { CITIES, CITY_BY_ID } from "./cities";
import type { CityRecord } from "@/lib/types";

/**
 * 起始城市预设：一键填入若干城市，把空白首屏直接带到「网格 + 热力图 + 拖拽」
 * 全部可用的状态——到 aha 时刻的最短路径。
 *
 * 稳定 id 由 makeId 派生（见 cities.ts，规则为 `国家代码-英文名 slug`）。
 * 这里按 id 引用、运行时用 CITY_BY_ID 解析，缺失项自动跳过，
 * 避免城市数据变动时硬编码失效。
 */
const NEW_YORK = "us-new-york";
const LONDON = "gb-london";
const TOKYO = "jp-tokyo";

/** 按 id 序列解析为城市记录（去重、跳过缺失）。 */
function resolve(ids: string[]): CityRecord[] {
  const out: CityRecord[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    const c = CITY_BY_ID[id];
    if (c) {
      out.push(c);
      seen.add(id);
    }
  }
  return out;
}

/**
 * 探测访客本地时区，匹配数据集中首个同 tz 城市（无匹配返回 null）。
 * 仅在浏览器执行；SSR / 异常时返回 null，由调用方回退到通用预设。
 */
export function detectLocalCity(): CityRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;
    return CITIES.find((c) => c.timeZone === tz) ?? null;
  } catch {
    return null;
  }
}

/**
 * 「从我的时区开始」：本地城市 + 纽约 + 伦敦 + 东京，去重后取前 3。
 * 这样无论本地是否为三巨头之一，总能凑出 3 座、且彼此有可见时差。
 * 探测不到本地城市时回退为纯三巨头预设。
 */
export function localStarterCities(): CityRecord[] {
  const local = detectLocalCity();
  const ids = local
    ? [local.id, NEW_YORK, LONDON, TOKYO]
    : [NEW_YORK, LONDON, TOKYO];
  return resolve(ids).slice(0, 3);
}

/** 「世界金融时钟」：纽约 · 伦敦 · 东京（follow-the-sun 三件套）。 */
export function financeStarterCities(): CityRecord[] {
  return resolve([NEW_YORK, LONDON, TOKYO]);
}
